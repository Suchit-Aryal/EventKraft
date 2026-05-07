// ============================================================
// Message Controller
// ============================================================

const Message = require('../models/Message');
const pool = require('../config/db');

module.exports = {

    // GET /messages/api/search-users — search users by name (JSON)
    async searchUsers(req, res) {
        try {
            const { q } = req.query;
            if (!q || q.trim().length < 2) return res.json([]);

            const result = await pool.query(
                `SELECT u.id, p.first_name, p.last_name, p.avatar_url, u.role
                 FROM users u
                 LEFT JOIN profiles p ON u.id = p.user_id
                 WHERE u.id != $1
                   AND (p.first_name ILIKE $2 OR p.last_name ILIKE $2
                        OR CONCAT(p.first_name, ' ', p.last_name) ILIKE $2)
                 ORDER BY p.first_name ASC
                 LIMIT 8`,
                [req.user.id, `%${q.trim()}%`]
            );
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.json([]);
        }
    },

    async index(req, res) {
        try {
            const conversations = await Message.getConversations(req.user.id);
            res.render('pages/messages', { title: 'Messages', layout: 'dashboard', activePage: 'messages', conversations });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load messages');
            res.redirect('/auth/dashboard');
        }
    },

    // POST /messages/start/:userId — Create or open a conversation with a user
    async startConversation(req, res) {
        try {
            const otherUserId = req.params.userId;
            if (otherUserId === req.user.id) {
                req.flash('error', 'You cannot message yourself');
                return res.redirect('/messages');
            }

            const conversation = await Message.getOrCreateConversation(req.user.id, otherUserId);
            res.redirect(`/messages/${conversation.id}`);
        } catch (err) {
            console.error('Start conversation error:', err);
            req.flash('error', 'Failed to start conversation');
            res.redirect('/messages');
        }
    },

    async show(req, res) {
        try {
            const conversation = await Message.getConversationById(req.params.conversationId);
            if (!conversation) return res.redirect('/messages');

            const messages = await Message.getByConversation(req.params.conversationId);
            await Message.markAsRead(req.params.conversationId, req.user.id);

            // Determine the other participant's info
            const isP1 = conversation.participant_1 === req.user.id;
            const otherName = isP1 ? conversation.p2_name : conversation.p1_name;
            const otherAvatar = null; // avatar not in conversation query, use fallback

            res.render('pages/conversation', {
                title: 'Conversation',
                layout: 'dashboard',
                activePage: 'messages',
                conversation,
                messages,
                otherName,
                otherAvatar
            });
        } catch (err) {
            console.error(err);
            res.redirect('/messages');
        }
    },

    async send(req, res) {
        try {
            const msg = await Message.send({
                conversationId: req.params.conversationId,
                senderId: req.user.id,
                receiverId: req.body.receiver_id,
                content: req.body.content,
                attachments: req.body.attachments,
                replyTo: req.body.reply_to || null
            });

            if (req.is('application/json')) {
                return res.json({ id: msg.id, created_at: msg.created_at });
            }
            res.redirect(`/messages/${req.params.conversationId}`);
        } catch (err) {
            console.error(err);
            if (req.is('application/json')) {
                return res.status(500).json({ error: 'Failed to send message' });
            }
            req.flash('error', 'Failed to send message');
            res.redirect(`/messages/${req.params.conversationId}`);
        }
    },

    // POST /messages/:conversationId/send-file — upload a file/image
    async sendFile(req, res) {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

            const cloudinary = require('../config/cloudinary');
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'eventkraft/chat', resource_type: 'auto' },
                    (err, r) => err ? reject(err) : resolve(r)
                );
                stream.end(req.file.buffer);
            });

            const msg = await Message.send({
                conversationId: req.params.conversationId,
                senderId: req.user.id,
                receiverId: req.body.receiver_id,
                content: req.body.content || '',
                replyTo: req.body.reply_to || null,
                fileUrl: result.secure_url,
                fileName: req.file.originalname,
                fileType: req.file.mimetype
            });

            res.json({ id: msg.id, created_at: msg.created_at, file_url: result.secure_url, file_name: req.file.originalname, file_type: req.file.mimetype });
        } catch (err) {
            console.error('File upload error:', err);
            res.status(500).json({ error: 'Failed to upload file' });
        }
    },

    // POST /messages/:messageId/unsend
    async unsend(req, res) {
        try {
            const msg = await Message.unsend(req.params.messageId, req.user.id);
            if (!msg) return res.status(403).json({ error: 'Cannot unsend this message' });
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to unsend' });
        }
    }
};

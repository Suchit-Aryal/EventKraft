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

    // ─── API: GET /messages/api/recent ──────────────────────────
    async getRecentConversationsApi(req, res) {
        try {
            const conversations = await Message.getConversations(req.user.id);
            // Just return top 5
            res.json(conversations.slice(0, 5));
        } catch (err) {
            console.error('Recent messages API error:', err);
            res.status(500).json({ error: 'Failed to fetch messages' });
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
            if (conversation.participant_1 !== req.user.id && conversation.participant_2 !== req.user.id) {
                req.flash('error', 'You do not have access to that conversation');
                return res.redirect('/messages');
            }

            const messages = normalizeBookingRequestMessages(await Message.getByConversation(req.params.conversationId));
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

    // ─── API: GET /messages/:conversationId/api/history ────────
    async getHistoryApi(req, res) {
        try {
            const conversation = await Message.getConversationById(req.params.conversationId);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.participant_1 !== req.user.id && conversation.participant_2 !== req.user.id) {
                return res.status(403).json({ error: 'Not a member of this conversation' });
            }

            const messages = normalizeBookingRequestMessages(await Message.getByConversation(req.params.conversationId));
            await Message.markAsRead(req.params.conversationId, req.user.id);
            res.json(messages);
        } catch (err) {
            console.error('History API error:', err);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    },

    async send(req, res) {
        try {
            const conversationId = req.params.conversationId;
            const { content, attachments, reply_to } = req.body;

            // Always verify membership and compute receiver server-side
            const conversation = await Message.getConversationById(conversationId);
            if (!conversation) {
                return req.is('application/json')
                    ? res.status(404).json({ error: 'Conversation not found' })
                    : res.redirect('/messages');
            }

            const isP1 = conversation.participant_1 === req.user.id;
            const isP2 = conversation.participant_2 === req.user.id;
            if (!isP1 && !isP2) {
                return req.is('application/json')
                    ? res.status(403).json({ error: 'Not a member of this conversation' })
                    : res.redirect('/messages');
            }

            // Compute receiver from the conversation — never trust client input
            const receiver_id = isP1 ? conversation.participant_2 : conversation.participant_1;

            // Single CTE query: INSERT + UPDATE in one round-trip
            const msg = await Message.send({
                conversationId,
                senderId: req.user.id,
                receiverId: receiver_id,
                content,
                attachments,
                replyTo: reply_to || null
            });

            // Respond to client IMMEDIATELY, then emit socket (non-blocking)
            if (req.is('application/json')) {
                res.json({ id: msg.id, created_at: msg.created_at });
            } else {
                res.redirect(`/messages/${conversationId}`);
            }

            // Fire-and-forget socket emit AFTER response is sent
            try {
                const io = req.app.get('io');
                if (io) {
                    const socketData = {
                        id: msg.id,
                        conversation_id: conversationId,
                        content: msg.content,
                        sender_id: req.user.id,
                        sender_name: req.user.first_name,
                        receiver_id: receiver_id,
                        created_at: msg.created_at
                    };
                    io.to(`conversation_${conversationId}`).emit('new-message', socketData);
                    io.to(`user_${receiver_id}`).emit('new-message-badge', socketData);
                }
            } catch (emitErr) {
                console.error('Socket emit error:', emitErr);
            }

        } catch (err) {
            console.error('Send message error:', err);
            if (res.headersSent) return;
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

            const conversation = await Message.getConversationById(req.params.conversationId);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

            const isP1 = conversation.participant_1 === req.user.id;
            const isP2 = conversation.participant_2 === req.user.id;
            if (!isP1 && !isP2) {
                return res.status(403).json({ error: 'Not a member of this conversation' });
            }

            const receiverId = isP1 ? conversation.participant_2 : conversation.participant_1;

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
                receiverId,
                content: req.body.content || '',
                replyTo: req.body.reply_to || null,
                fileUrl: result.secure_url,
                fileName: req.file.originalname,
                fileType: req.file.mimetype
            });

            res.json({ id: msg.id, created_at: msg.created_at, file_url: result.secure_url, file_name: req.file.originalname, file_type: req.file.mimetype });

            try {
                const io = req.app.get('io');
                if (io) {
                    const socketData = {
                        id: msg.id,
                        conversation_id: req.params.conversationId,
                        content: msg.content,
                        sender_id: req.user.id,
                        sender_name: req.user.first_name,
                        receiver_id: receiverId,
                        file_url: result.secure_url,
                        file_name: req.file.originalname,
                        file_type: req.file.mimetype,
                        created_at: msg.created_at
                    };
                    io.to(`conversation_${req.params.conversationId}`).emit('new-message', socketData);
                    io.to(`user_${receiverId}`).emit('new-message-badge', socketData);
                }
            } catch (emitErr) {
                console.error('File socket emit error:', emitErr);
            }
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

function normalizeBookingRequestMessages(messages) {
    return messages.map((message) => {
        if (message.message_type === 'booking_request') return message;
        if (!message.content) return message;

        try {
            const payload = JSON.parse(message.content);
            if (payload && payload.type === 'booking_request') {
                message.message_type = 'booking_request';
                message.booking_id = message.booking_id || payload.booking_id;
                message.gig_title = message.gig_title || payload.gig_title;
                message.package_name = message.package_name || payload.package_name;
                message.total_amount = message.total_amount || payload.total_amount || payload.total_price;
                message.event_date = message.event_date || payload.event_date;
                message.event_location = message.event_location || payload.event_location || payload.event_venue;
                message.customer_note = message.customer_note || payload.customer_note;
            }
        } catch (err) {}

        return message;
    });
}

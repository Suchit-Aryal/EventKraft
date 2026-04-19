// ============================================================
// Message Controller
// ============================================================

const Message = require('../models/Message');

module.exports = {

    async index(req, res) {
        try {
            const conversations = await Message.getConversations(req.user.id);
            res.render('pages/messages', { title: 'Messages', conversations });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load messages');
            res.redirect('/auth/dashboard');
        }
    },

    async show(req, res) {
        try {
            const messages = await Message.getByConversation(req.params.conversationId);
            await Message.markAsRead(req.params.conversationId, req.user.id);
            res.render('pages/conversation', { title: 'Conversation', messages, conversationId: req.params.conversationId });
        } catch (err) {
            console.error(err);
            res.redirect('/messages');
        }
    },

    async send(req, res) {
        try {
            await Message.send({
                conversationId: req.params.conversationId,
                senderId: req.user.id,
                receiverId: req.body.receiver_id,
                content: req.body.content,
                attachments: req.body.attachments
            });
            res.redirect(`/messages/${req.params.conversationId}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to send message');
            res.redirect(`/messages/${req.params.conversationId}`);
        }
    }
};

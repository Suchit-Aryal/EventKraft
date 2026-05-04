// ============================================================
// Message Routes — /messages/*
// ============================================================

const express = require('express');
const router = express.Router();
const msgCtrl = require('../controllers/messageController');
const { ensureAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET  /messages                       – List conversations
router.get('/', ensureAuthenticated, msgCtrl.index);

// POST /messages/start/:userId      – Start/open conversation with user
router.post('/start/:userId', ensureAuthenticated, msgCtrl.startConversation);

// GET  /messages/api/search-users    – Search users by name (JSON)
router.get('/api/search-users', ensureAuthenticated, msgCtrl.searchUsers);

// GET  /messages/:conversationId       – View conversation
router.get('/:conversationId', ensureAuthenticated, msgCtrl.show);

// POST /messages/:conversationId/send  – Send a message
router.post('/:conversationId/send', ensureAuthenticated, msgCtrl.send);

// POST /messages/:conversationId/send-file – Send a file/photo
router.post('/:conversationId/send-file', ensureAuthenticated, upload.single('chatFile'), msgCtrl.sendFile);

// POST /messages/:messageId/unsend     – Unsend a message
router.post('/:messageId/unsend', ensureAuthenticated, msgCtrl.unsend);

module.exports = router;

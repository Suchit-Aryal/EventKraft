// ============================================================
// Message Routes — /messages/*
// ============================================================

const express = require('express');
const router = express.Router();
const msgCtrl = require('../controllers/messageController');
const { ensureAuthenticated } = require('../middleware/auth');

// GET  /messages                       – List conversations
router.get('/', ensureAuthenticated, msgCtrl.index);

// GET  /messages/:conversationId       – View conversation
router.get('/:conversationId', ensureAuthenticated, msgCtrl.show);

// POST /messages/:conversationId/send  – Send a message
router.post('/:conversationId/send', ensureAuthenticated, msgCtrl.send);

module.exports = router;

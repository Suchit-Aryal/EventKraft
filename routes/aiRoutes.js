// ============================================================
// AI Routes — EventKraft assistant chat API
// ============================================================

const express = require('express');
const router = express.Router();
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { ensureAuthenticated } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

// 10 requests per minute per user
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.user ? `ai:${req.user.id}` : ipKeyGenerator(req.ip),
    message: { error: 'Too many messages — wait a minute and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/chat', ensureAuthenticated, aiLimiter, aiController.chat);
router.post('/posting', ensureAuthenticated, aiLimiter, aiController.postingAssistant);

module.exports = router;

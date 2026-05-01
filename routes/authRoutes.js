// ============================================================
// Auth Routes — /auth/*
// ============================================================

const express = require('express');
const router = express.Router();
const passport = require('passport');
const authCtrl = require('../controllers/authController');
const { ensureGuest, ensureAuthenticated } = require('../middleware/auth');

// ── Local Auth ──────────────────────────────────────────────
router.get('/login', ensureGuest, authCtrl.getLogin);
router.post('/login', authCtrl.postLogin);
router.get('/register', ensureGuest, authCtrl.getRegister);
router.post('/register', authCtrl.postRegister);
router.get('/logout', ensureAuthenticated, authCtrl.logout);
router.get('/dashboard', ensureAuthenticated, authCtrl.getDashboard);

// ── Email Verification ─────────────────────────────────────
router.get('/verify', authCtrl.getVerify);
router.post('/verify', authCtrl.postVerify);
router.post('/verify/resend', authCtrl.resendCode);

// ── Two-Factor Authentication (Login Step) ──────────────────
router.get('/2fa', authCtrl.get2FA);
router.post('/2fa', authCtrl.post2FA);

// ── Google OAuth ────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    router.get('/google',
        passport.authenticate('google', { scope: ['profile', 'email'] })
    );
    router.get('/google/callback',
        passport.authenticate('google', {
            failureRedirect: '/auth/login',
            failureFlash: 'Google login failed. Please try again.'
        }),
        authCtrl.googleCallback
    );
}

// ── User Settings (Security / 2FA) ─────────────────────────
router.get('/settings', ensureAuthenticated, authCtrl.getSettings);
router.post('/settings/2fa/setup', ensureAuthenticated, authCtrl.setup2FA);
router.post('/settings/2fa/verify', ensureAuthenticated, authCtrl.verify2FASetup);
router.post('/settings/2fa/disable', ensureAuthenticated, authCtrl.disable2FA);

module.exports = router;

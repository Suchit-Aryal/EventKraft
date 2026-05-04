// ============================================================
// Onboarding Routes — /onboarding/* (Google OAuth profile setup)
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { ensureAuthenticated } = require('../middleware/auth');

// GET /onboarding/step1 — Choose role
router.get('/step1', ensureAuthenticated, (req, res) => {
    if (req.user.profile_complete) return res.redirect('/auth/dashboard');
    res.render('pages/onboarding-step1', { title: 'Welcome — Choose Your Role' });
});

// POST /onboarding/step1 — Save role
router.post('/step1', ensureAuthenticated, (req, res) => {
    req.session.onboardingDraft = { role: req.body.role };
    res.redirect('/onboarding/step2');
});

// GET /onboarding/step2 — Profile details
router.get('/step2', ensureAuthenticated, async (req, res) => {
    if (req.user.profile_complete) return res.redirect('/auth/dashboard');
    const profile = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);
    res.render('pages/onboarding-step2', {
        title: 'Complete Your Profile',
        profile: profile.rows[0] || {},
        draft: req.session.onboardingDraft || {}
    });
});

// POST /onboarding/step2 — Save profile details
router.post('/step2', ensureAuthenticated, (req, res) => {
    req.session.onboardingDraft = {
        ...req.session.onboardingDraft,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        phone: req.body.phone,
        address: req.body.address
    };
    res.redirect('/onboarding/step3');
});

// GET /onboarding/step3 — Set password
router.get('/step3', ensureAuthenticated, (req, res) => {
    if (req.user.profile_complete) return res.redirect('/auth/dashboard');
    res.render('pages/onboarding-step3', { title: 'Create a Password' });
});

// POST /onboarding/step3 — Final submit
router.post('/step3', ensureAuthenticated, async (req, res) => {
    try {
        const { password, confirm_password } = req.body;
        if (password !== confirm_password) {
            req.flash('error', "Passwords don't match");
            return res.redirect('/onboarding/step3');
        }

        const hashed = await bcrypt.hash(password, 12);
        const draft = req.session.onboardingDraft || {};

        // Update user role + password
        await pool.query(
            `UPDATE users SET role = $1, phone = $2, password_hash = $3, profile_complete = true WHERE id = $4`,
            [draft.role || 'customer', draft.phone || null, hashed, req.user.id]
        );

        // Update profile
        await pool.query(
            `UPDATE profiles SET first_name = $1, last_name = $2, address = $3 WHERE user_id = $4`,
            [draft.first_name, draft.last_name, draft.address || null, req.user.id]
        );

        delete req.session.onboardingDraft;
        req.flash('success', 'Welcome to EventKraft! 🎉');
        res.redirect('/auth/dashboard');
    } catch (err) {
        console.error('Onboarding error:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/onboarding/step3');
    }
});

module.exports = router;

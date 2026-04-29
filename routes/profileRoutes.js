// ============================================================
// Profile Routes — Public user profile pages
// ============================================================

const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const pool = require('../config/db');

// GET /profile/:id — Public profile page
router.get('/:id', async (req, res) => {
    try {
        const profile = await Profile.getPublicProfile(req.params.id);
        if (!profile) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        // Get worker's active services
        const gigsResult = await pool.query(
            `SELECT sg.*, c.name AS category_name
             FROM service_gigs sg
             LEFT JOIN categories c ON sg.category_id = c.id
             WHERE sg.worker_id = $1 AND sg.status = 'active'
             ORDER BY sg.created_at DESC`,
            [req.params.id]
        );

        res.render('pages/profile', {
            title: `${profile.first_name} ${profile.last_name || ''} — EventKraft`,
            profile,
            userId: req.params.id,
            gigs: gigsResult.rows
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to load profile');
        res.redirect('/');
    }
});

module.exports = router;

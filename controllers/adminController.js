// ============================================================
// Admin Controller
// ============================================================

const User = require('../models/User');
const pool = require('../config/db');

module.exports = {

    // GET /admin
    async dashboard(req, res) {
        try {
            const stats = {};
            stats.totalUsers = (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count;
            stats.totalJobs = (await pool.query('SELECT COUNT(*) FROM job_postings')).rows[0].count;
            stats.totalGigs = (await pool.query('SELECT COUNT(*) FROM service_gigs')).rows[0].count;
            stats.totalBookings = (await pool.query('SELECT COUNT(*) FROM bookings')).rows[0].count;
            stats.openDisputes = (await pool.query("SELECT COUNT(*) FROM disputes WHERE status = 'open'")).rows[0].count;

            res.render('pages/admin-dashboard', { title: 'Admin Dashboard', stats });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load admin dashboard');
            res.redirect('/');
        }
    },

    // GET /admin/users
    async users(req, res) {
        try {
            const users = await User.findAll();
            res.render('pages/admin-users', { title: 'Manage Users', users });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load users');
            res.redirect('/admin');
        }
    },

    // PUT /admin/users/:id
    async updateUser(req, res) {
        try {
            const { is_active, is_verified } = req.body;
            if (is_active !== undefined) await User.setActive(req.params.id, is_active === 'true');
            if (is_verified !== undefined) await User.setVerified(req.params.id, is_verified === 'true');
            req.flash('success', 'User updated');
            res.redirect('/admin/users');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to update user');
            res.redirect('/admin/users');
        }
    },

    // GET /admin/bookings
    async bookings(req, res) {
        try {
            const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
            res.render('pages/admin-bookings', { title: 'All Bookings', bookings: result.rows });
        } catch (err) {
            console.error(err);
            res.redirect('/admin');
        }
    },

    // GET /admin/disputes
    async disputes(req, res) {
        try {
            const result = await pool.query('SELECT * FROM disputes ORDER BY created_at DESC');
            res.render('pages/admin-disputes', { title: 'Disputes', disputes: result.rows });
        } catch (err) {
            console.error(err);
            res.redirect('/admin');
        }
    },

    // PUT /admin/disputes/:id
    async resolveDispute(req, res) {
        try {
            await pool.query(
                'UPDATE disputes SET status = $1, resolution = $2, resolved_by = $3, resolved_at = NOW() WHERE id = $4',
                [req.body.status, req.body.resolution, req.user.id, req.params.id]
            );
            req.flash('success', 'Dispute resolved');
            res.redirect('/admin/disputes');
        } catch (err) {
            console.error(err);
            res.redirect('/admin/disputes');
        }
    },

    // GET /admin/commissions
    async commissions(req, res) {
        try {
            const result = await pool.query('SELECT * FROM commission_settings ORDER BY min_amount');
            res.render('pages/admin-commissions', { title: 'Commission Settings', commissions: result.rows });
        } catch (err) {
            console.error(err);
            res.redirect('/admin');
        }
    },

    // PUT /admin/commissions/:id
    async updateCommission(req, res) {
        try {
            await pool.query(
                'UPDATE commission_settings SET rate = $1, is_active = $2, updated_by = $3 WHERE id = $4',
                [req.body.rate, req.body.is_active === 'true', req.user.id, req.params.id]
            );
            req.flash('success', 'Commission updated');
            res.redirect('/admin/commissions');
        } catch (err) {
            console.error(err);
            res.redirect('/admin/commissions');
        }
    }
};

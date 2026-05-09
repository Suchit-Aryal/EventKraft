// ============================================================
// Admin Controller — Full CRM with real data
// ============================================================

const User = require('../models/User');
const pool = require('../config/db');

module.exports = {

    // GET /admin — Dashboard with platform stats
    async dashboard(req, res) {
        try {
            const stats = {};

            // User stats
            const userStats = await pool.query(`
                SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE role = 'customer') AS customers,
                    COUNT(*) FILTER (WHERE role = 'worker') AS workers,
                    COUNT(*) FILTER (WHERE is_active = true) AS active,
                    COUNT(*) FILTER (WHERE is_verified = true) AS verified
                FROM users
            `);
            stats.users = userStats.rows[0];

            // Job/Gig stats
            const jobStats = await pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'published') AS active FROM job_postings");
            const gigStats = await pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active FROM service_gigs");
            stats.jobs = jobStats.rows[0];
            stats.gigs = gigStats.rows[0];

            // Booking + Revenue stats
            const bookingStats = await pool.query(`
                SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                    COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue,
                    COALESCE(SUM(commission_amount) FILTER (WHERE status = 'completed'), 0) AS commission
                FROM bookings
            `);
            stats.bookings = bookingStats.rows[0];

            // Dispute stats
            const disputeStats = await pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open FROM disputes");
            stats.disputes = disputeStats.rows[0];

            // Recent bookings
            const recentBookings = await pool.query(`
                SELECT b.id, b.status, b.total_amount, b.created_at,
                    cp.first_name AS customer_name, wp.first_name AS worker_name
                FROM bookings b
                LEFT JOIN profiles cp ON b.customer_id = cp.user_id
                LEFT JOIN profiles wp ON b.worker_id = wp.user_id
                ORDER BY b.created_at DESC LIMIT 5
            `);

            // Recent users
            const recentUsers = await pool.query(`
                SELECT u.id, u.email, u.role, u.is_active, u.created_at,
                    p.first_name, p.last_name
                FROM users u LEFT JOIN profiles p ON u.id = p.user_id
                ORDER BY u.created_at DESC LIMIT 5
            `);

            res.render('pages/admin-dashboard', {
                title: 'Admin Dashboard',
                layout: 'dashboard',
                activePage: 'admin',
                stats,
                recentBookings: recentBookings.rows,
                recentUsers: recentUsers.rows
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load admin dashboard');
            res.redirect('/');
        }
    },

    // GET /admin/users
    async users(req, res) {
        try {
            const users = await pool.query(`
                SELECT u.id, u.email, u.phone, u.role, u.is_verified, u.is_active, u.created_at,
                    p.first_name, p.last_name, p.avg_rating, p.total_completed, p.city
                FROM users u LEFT JOIN profiles p ON u.id = p.user_id
                ORDER BY u.created_at DESC
            `);
            res.render('pages/admin-users', { title: 'Manage Users', layout: 'dashboard', activePage: 'admin', users: users.rows });
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
            const result = await pool.query(`
                SELECT b.*, cp.first_name AS customer_name, wp.first_name AS worker_name
                FROM bookings b
                LEFT JOIN profiles cp ON b.customer_id = cp.user_id
                LEFT JOIN profiles wp ON b.worker_id = wp.user_id
                ORDER BY b.created_at DESC
            `);
            res.render('pages/admin-bookings', { title: 'All Bookings', layout: 'dashboard', activePage: 'admin', bookings: result.rows });
        } catch (err) {
            console.error(err);
            res.redirect('/admin');
        }
    },

    // GET /admin/disputes
    async disputes(req, res) {
        try {
            const result = await pool.query(`
                SELECT d.*, b.total_amount, b.event_date,
                    rp.first_name AS raiser_name, rp.last_name AS raiser_last,
                    ru.email AS raiser_email
                FROM disputes d
                JOIN bookings b ON d.booking_id = b.id
                JOIN profiles rp ON d.raised_by = rp.user_id
                JOIN users ru ON d.raised_by = ru.id
                ORDER BY d.created_at DESC
            `);
            res.render('pages/admin-disputes', { title: 'Disputes', layout: 'dashboard', activePage: 'admin', disputes: result.rows });
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
            res.render('pages/admin-commissions', { title: 'Commission Settings', layout: 'dashboard', activePage: 'admin', commissions: result.rows });
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
    },

    // ─── KYC Management ───────────────────────────────────────────

    async kycList(req, res) {
        try {
            const { rows } = await pool.query(
                `SELECT k.*, u.email,
                        p.first_name, p.last_name, p.avatar_url,
                        u.kyc_status
                 FROM kyc_submissions k
                 JOIN users u ON u.id = k.user_id
                 LEFT JOIN profiles p ON p.user_id = k.user_id
                 ORDER BY
                   CASE k.status WHEN 'pending' THEN 0 ELSE 1 END,
                   k.submitted_at DESC`
            );
            res.render('pages/admin-kyc-list', { 
                title: 'KYC Verification', 
                layout: 'dashboard', 
                activePage: 'admin', 
                submissions: rows 
            });
        } catch (err) {
            console.error('Admin KYC list error:', err);
            req.flash('error', 'Could not load KYC submissions.');
            res.redirect('/admin');
        }
    },

    async approveKyc(req, res) {
        try {
            const { userId } = req.params;
            const { createNotification } = require('../utils/notify');
            
            await pool.query(`UPDATE users SET kyc_status = 'approved' WHERE id = $1`, [userId]);
            await pool.query(`UPDATE profiles SET is_admin_verified = true WHERE user_id = $1`, [userId]);
            await pool.query(
                `UPDATE kyc_submissions SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1 WHERE user_id = $2`,
                [req.user.id, userId]
            );
            
            await createNotification(pool, req.app.get('io'), {
                userId,
                type: 'kyc_approved',
                title: 'Your identity has been verified!',
                message: 'You now have a Verified badge and can post services on EventKraft.',
                link: '/dashboard',
            });
            
            req.flash('success', 'KYC approved.');
            res.redirect('/admin/kyc');
        } catch (err) {
            console.error('KYC approve error:', err);
            req.flash('error', 'Could not approve KYC.');
            res.redirect('/admin/kyc');
        }
    },

    async rejectKyc(req, res) {
        try {
            const { userId } = req.params;
            const { createNotification } = require('../utils/notify');
            const reason = req.body.reason?.trim() || 'Your document could not be verified. Please resubmit with a clearer image.';
            
            await pool.query(`UPDATE users SET kyc_status = 'rejected' WHERE id = $1`, [userId]);
            await pool.query(
                `UPDATE kyc_submissions SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE user_id = $3`,
                [reason, req.user.id, userId]
            );
            
            await createNotification(pool, req.app.get('io'), {
                userId,
                type: 'kyc_rejected',
                title: 'KYC verification failed — please resubmit',
                message: reason,
                link: '/dashboard/kyc',
            });
            
            req.flash('success', 'KYC rejected and worker notified.');
            res.redirect('/admin/kyc');
        } catch (err) {
            console.error('KYC reject error:', err);
            req.flash('error', 'Could not reject KYC.');
            res.redirect('/admin/kyc');
        }
    }
};

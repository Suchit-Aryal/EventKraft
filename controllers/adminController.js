// ============================================================
// Admin Controller — Full CRM with real data
// ============================================================

const User = require('../models/User');
const Booking = require('../models/Booking');
const pool = require('../config/db');

module.exports = {

    // GET /admin — Dashboard with platform stats
    async dashboard(req, res) {
        try {
            // Auto-flag overdue bookings on every admin dashboard load
            await flagOverdueBookings();

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
            res.render('pages/admin-users', { title: 'Manage Users', layout: 'dashboard', activePage: 'admin-users', users: users.rows });
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
            res.render('pages/admin-bookings', { title: 'All Bookings', layout: 'dashboard', activePage: 'admin-bookings', bookings: result.rows });
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
            res.render('pages/admin-disputes', { title: 'Disputes', layout: 'dashboard', activePage: 'admin-disputes', disputes: result.rows });
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
            res.render('pages/admin-commissions', { title: 'Commission Settings', layout: 'dashboard', activePage: 'admin-commissions', commissions: result.rows });
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

    // ─── Service (Gig) Moderation ─────────────────────────────────

    async services(req, res) {
        try {
            const { status, keyword } = req.query;
            let whereClause = '';
            const params = [];

            if (status) {
                params.push(status);
                whereClause += ` AND sg.status = $${params.length}`;
            }
            if (keyword) {
                params.push(`%${keyword}%`);
                whereClause += ` AND (sg.title ILIKE $${params.length} OR p.first_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
            }

            const result = await pool.query(`
                SELECT sg.*, c.name AS category_name,
                    p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                    u.email AS worker_email
                FROM service_gigs sg
                LEFT JOIN categories c ON sg.category_id = c.id
                LEFT JOIN profiles p ON sg.worker_id = p.user_id
                LEFT JOIN users u ON sg.worker_id = u.id
                WHERE 1=1 ${whereClause}
                ORDER BY sg.created_at DESC
            `, params);

            res.render('pages/admin-services', {
                title: 'Manage Services',
                layout: 'dashboard',
                activePage: 'admin-services',
                gigs: result.rows,
                filters: { status: status || '', keyword: keyword || '' }
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load services');
            res.redirect('/admin');
        }
    },

    async updateService(req, res) {
        try {
            const { status } = req.body;
            const allowed = ['active', 'paused', 'draft'];
            if (!allowed.includes(status)) {
                req.flash('error', 'Invalid status');
                return res.redirect('/admin/services');
            }
            await pool.query('UPDATE service_gigs SET status = $1 WHERE id = $2', [status, req.params.id]);
            req.flash('success', 'Service status updated');
            res.redirect('/admin/services');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to update service');
            res.redirect('/admin/services');
        }
    },

    // ─── Job Moderation ─────────────────────────────────────────

    async jobs(req, res) {
        try {
            const { status, keyword } = req.query;
            let whereClause = '';
            const params = [];

            if (status) {
                params.push(status);
                whereClause += ` AND jp.status = $${params.length}`;
            }
            if (keyword) {
                params.push(`%${keyword}%`);
                whereClause += ` AND (jp.title ILIKE $${params.length} OR p.first_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
            }

            const result = await pool.query(`
                SELECT jp.*, c.name AS category_name,
                    p.first_name AS customer_first_name, p.last_name AS customer_last_name,
                    u.email AS customer_email,
                    (SELECT COUNT(*) FROM proposals pr WHERE pr.job_id = jp.id) AS proposal_count
                FROM job_postings jp
                LEFT JOIN categories c ON jp.category_id = c.id
                LEFT JOIN profiles p ON jp.customer_id = p.user_id
                LEFT JOIN users u ON jp.customer_id = u.id
                WHERE 1=1 ${whereClause}
                ORDER BY jp.created_at DESC
            `, params);

            res.render('pages/admin-jobs', {
                title: 'Manage Jobs',
                layout: 'dashboard',
                activePage: 'admin-jobs',
                jobs: result.rows,
                filters: { status: status || '', keyword: keyword || '' }
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load jobs');
            res.redirect('/admin');
        }
    },

    async updateJob(req, res) {
        try {
            const { status } = req.body;
            const allowed = ['published', 'closed', 'draft', 'cancelled'];
            if (!allowed.includes(status)) {
                req.flash('error', 'Invalid status');
                return res.redirect('/admin/jobs');
            }
            await pool.query('UPDATE job_postings SET status = $1 WHERE id = $2', [status, req.params.id]);
            req.flash('success', 'Job status updated');
            res.redirect('/admin/jobs');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to update job');
            res.redirect('/admin/jobs');
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
                activePage: 'admin-kyc',
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

// ─── Admin Helper Functions ──────────────────────────────────

async function flagOverdueBookings() {
    try {
        // Auto-cancel bookings where advance deadline passed without payment
        await pool.query(`
            UPDATE bookings SET status = 'cancelled'
            WHERE status IN ('accepted', 'awaiting_agreement')
            AND advance_deadline < NOW()
            AND advance_paid_at IS NULL
        `);
        // Flag bookings where final deadline passed without payment
        await pool.query(`
            UPDATE bookings SET status = 'overdue_final', overdue_flagged_at = NOW()
            WHERE status = 'work_done'
            AND final_deadline < NOW()
            AND final_paid_at IS NULL
            AND dispute_raised_at IS NULL
        `);
    } catch (err) {
        console.error('flagOverdueBookings error:', err.message);
    }
}

async function getLegalActionBookings() {
    const result = await pool.query(`
        SELECT
            b.*,
            p_customer.first_name || ' ' || p_customer.last_name AS customer_name,
            u_customer.email AS customer_email,
            u_customer.phone AS customer_phone,
            p_worker.first_name || ' ' || p_worker.last_name AS worker_name,
            ba.agreed_at AS agreement_timestamp,
            ba.ip_address AS customer_ip,
            ba.agreement_version,
            sg.title AS gig_title_full
        FROM bookings b
        JOIN users u_customer ON b.customer_id = u_customer.id
        JOIN profiles p_customer ON b.customer_id = p_customer.user_id
        JOIN users u_worker ON b.worker_id = u_worker.id
        JOIN profiles p_worker ON b.worker_id = p_worker.user_id
        LEFT JOIN booking_agreements ba ON b.id = ba.booking_id
        LEFT JOIN service_gigs sg ON b.gig_id = sg.id
        WHERE b.status IN ('overdue_final', 'legal_action')
        ORDER BY b.overdue_flagged_at DESC NULLS LAST
    `);
    return result.rows;
}

module.exports.legalAction = async function(req, res) {
    try {
        await flagOverdueBookings();
        const bookings = await getLegalActionBookings();
        res.render('pages/admin-legal', {
            title: 'Legal Action Panel — EventKraft',
            layout: 'dashboard',
            activePage: 'admin-legal',
            bookings,
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to load legal action panel');
        res.redirect('/admin');
    }
};

module.exports.markLegalAction = async function(req, res) {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            req.flash('error', 'Booking not found.');
            return res.redirect('/admin/legal-action');
        }
        if (booking.status !== 'overdue_final') {
            req.flash('error', 'Only overdue bookings can be moved to legal action.');
            return res.redirect('/admin/legal-action');
        }
        await pool.query("UPDATE bookings SET status = 'legal_action' WHERE id = $1 AND status = 'overdue_final'", [req.params.id]);
        req.flash('success', 'Booking marked as legal action.');
        res.redirect('/admin/legal-action');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to update booking.');
        res.redirect('/admin/legal-action');
    }
};

module.exports.resolveOverdue = async function(req, res) {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            req.flash('error', 'Booking not found.');
            return res.redirect('/admin/legal-action');
        }
        if (!['overdue_final', 'legal_action'].includes(booking.status)) {
            req.flash('error', 'Only overdue or legal-action bookings can be resolved here.');
            return res.redirect('/admin/legal-action');
        }
        await pool.query("UPDATE bookings SET status = 'completed' WHERE id = $1 AND status IN ('overdue_final', 'legal_action')", [req.params.id]);
        req.flash('success', 'Booking marked as resolved.');
        res.redirect('/admin/legal-action');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to resolve booking.');
        res.redirect('/admin/legal-action');
    }
};

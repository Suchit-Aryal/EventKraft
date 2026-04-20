// ============================================================
// Auth Controller — with full dashboard data
// ============================================================

const passport = require('passport');
const User = require('../models/User');
const Profile = require('../models/Profile');
const pool = require('../config/db');

module.exports = {

    // GET /auth/login
    getLogin(req, res) {
        res.render('pages/login', { title: 'Login — EventKraft' });
    },

    // POST /auth/login
    postLogin(req, res, next) {
        passport.authenticate('local', {
            successRedirect: '/auth/dashboard',
            failureRedirect: '/auth/login',
            failureFlash: true
        })(req, res, next);
    },

    // GET /auth/register
    getRegister(req, res) {
        res.render('pages/register', { title: 'Register — EventKraft' });
    },

    // POST /auth/register
    async postRegister(req, res) {
        try {
            const { email, phone, password, confirmPassword, role } = req.body;

            if (password !== confirmPassword) {
                req.flash('error', 'Passwords do not match');
                return res.redirect('/auth/register');
            }

            const existing = await User.findByEmail(email);
            if (existing) {
                req.flash('error', 'Email is already registered');
                return res.redirect('/auth/register');
            }

            const user = await User.create({ email, phone, password, role });

            const { first_name, last_name } = req.body;
            await pool.query(
                'INSERT INTO profiles (user_id, first_name, last_name) VALUES ($1, $2, $3)',
                [user.id, first_name || '', last_name || '']
            );

            req.flash('success', 'Account created! Please log in.');
            res.redirect('/auth/login');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Something went wrong. Please try again.');
            res.redirect('/auth/register');
        }
    },

    // GET /auth/logout
    logout(req, res) {
        req.logout((err) => {
            if (err) console.error(err);
            req.flash('success', 'Logged out successfully');
            res.redirect('/');
        });
    },

    // GET /auth/dashboard — role-based CRM dashboard with real data
    async getDashboard(req, res) {
        try {
            const userId = req.user.id;
            const profile = await Profile.findByUserId(userId);

            switch (req.user.role) {
                case 'admin':
                    return res.redirect('/admin');

                case 'worker':
                    return await renderWorkerDashboard(req, res, userId, profile);

                case 'customer':
                default:
                    return await renderCustomerDashboard(req, res, userId, profile);
            }
        } catch (err) {
            console.error('Dashboard error:', err);
            req.flash('error', 'Failed to load dashboard');
            res.redirect('/');
        }
    }
};

// ── Worker Dashboard ────────────────────────────────────────
async function renderWorkerDashboard(req, res, userId, profile) {
    // Stats
    const gigsResult = await pool.query(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active FROM service_gigs WHERE worker_id = $1", [userId]
    );
    const proposalsResult = await pool.query(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'pending') AS pending, COUNT(*) FILTER (WHERE status = 'accepted') AS accepted FROM proposals WHERE worker_id = $1", [userId]
    );
    const bookingsResult = await pool.query(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'in_progress') AS active, COALESCE(SUM(worker_earning) FILTER (WHERE status = 'completed'), 0) AS earnings FROM bookings WHERE worker_id = $1", [userId]
    );
    const reviewsResult = await pool.query(
        "SELECT COUNT(*) AS total, COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating FROM reviews WHERE reviewee_id = $1", [userId]
    );

    // Tables
    const gigs = await pool.query(
        `SELECT sg.*, c.name AS category_name FROM service_gigs sg
         LEFT JOIN categories c ON sg.category_id = c.id
         WHERE sg.worker_id = $1 ORDER BY sg.created_at DESC LIMIT 10`, [userId]
    );
    const proposals = await pool.query(
        `SELECT pr.*, jp.title AS job_title, jp.budget_min, jp.budget_max, jp.event_date
         FROM proposals pr JOIN job_postings jp ON pr.job_id = jp.id
         WHERE pr.worker_id = $1 ORDER BY pr.created_at DESC LIMIT 10`, [userId]
    );
    const bookings = await pool.query(
        `SELECT b.*, cp.first_name AS customer_name, sg.title AS gig_title, jp.title AS job_title
         FROM bookings b
         LEFT JOIN profiles cp ON b.customer_id = cp.user_id
         LEFT JOIN service_gigs sg ON b.gig_id = sg.id
         LEFT JOIN job_postings jp ON b.job_id = jp.id
         WHERE b.worker_id = $1 ORDER BY b.created_at DESC LIMIT 10`, [userId]
    );
    const reviews = await pool.query(
        `SELECT r.*, p.first_name AS reviewer_name, p.avatar_url AS reviewer_avatar
         FROM reviews r JOIN profiles p ON r.reviewer_id = p.user_id
         WHERE r.reviewee_id = $1 ORDER BY r.created_at DESC LIMIT 5`, [userId]
    );

    res.render('pages/worker-dashboard', {
        title: 'Worker Dashboard',
        profile,
        stats: {
            totalGigs: gigsResult.rows[0].total,
            activeGigs: gigsResult.rows[0].active,
            totalProposals: proposalsResult.rows[0].total,
            pendingProposals: proposalsResult.rows[0].pending,
            acceptedProposals: proposalsResult.rows[0].accepted,
            totalBookings: bookingsResult.rows[0].total,
            activeBookings: bookingsResult.rows[0].active,
            totalEarnings: bookingsResult.rows[0].earnings,
            totalReviews: reviewsResult.rows[0].total,
            avgRating: reviewsResult.rows[0].avg_rating
        },
        gigs: gigs.rows,
        proposals: proposals.rows,
        bookings: bookings.rows,
        reviews: reviews.rows
    });
}

// ── Customer Dashboard ──────────────────────────────────────
async function renderCustomerDashboard(req, res, userId, profile) {
    const jobsResult = await pool.query(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'published') AS active FROM job_postings WHERE customer_id = $1", [userId]
    );
    const proposalsForMe = await pool.query(
        "SELECT COUNT(*) FROM proposals pr JOIN job_postings jp ON pr.job_id = jp.id WHERE jp.customer_id = $1 AND pr.status = 'pending'", [userId]
    );
    const bookingsResult = await pool.query(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'in_progress') AS active, COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS spent FROM bookings WHERE customer_id = $1", [userId]
    );

    const jobs = await pool.query(
        `SELECT jp.*, c.name AS category_name,
                (SELECT COUNT(*) FROM proposals WHERE job_id = jp.id) AS proposal_count
         FROM job_postings jp LEFT JOIN categories c ON jp.category_id = c.id
         WHERE jp.customer_id = $1 ORDER BY jp.created_at DESC LIMIT 10`, [userId]
    );
    const bookings = await pool.query(
        `SELECT b.*, wp.first_name AS worker_name, sg.title AS gig_title, jp.title AS job_title
         FROM bookings b
         LEFT JOIN profiles wp ON b.worker_id = wp.user_id
         LEFT JOIN service_gigs sg ON b.gig_id = sg.id
         LEFT JOIN job_postings jp ON b.job_id = jp.id
         WHERE b.customer_id = $1 ORDER BY b.created_at DESC LIMIT 10`, [userId]
    );

    res.render('pages/customer-dashboard', {
        title: 'Customer Dashboard',
        profile,
        stats: {
            totalJobs: jobsResult.rows[0].total,
            activeJobs: jobsResult.rows[0].active,
            pendingProposals: proposalsForMe.rows[0].count,
            totalBookings: bookingsResult.rows[0].total,
            activeBookings: bookingsResult.rows[0].active,
            totalSpent: bookingsResult.rows[0].spent
        },
        jobs: jobs.rows,
        bookings: bookings.rows
    });
}

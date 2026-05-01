// ============================================================
// Auth Controller — with Google OAuth, Email Verification & 2FA
// Plus full CRM dashboard data
// ============================================================

const passport = require('passport');
const User = require('../models/User');
const Profile = require('../models/Profile');
const pool = require('../config/db');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { sendVerificationEmail, send2FAEnabledEmail } = require('../config/mailer');

// Generate 6-digit verification code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {

    // GET /auth/login
    getLogin(req, res) {
        res.render('pages/login', {
            title: 'Log In — EventKraft',
            googleEnabled: !!(process.env.GOOGLE_CLIENT_ID)
        });
    },

    // POST /auth/login
    postLogin(req, res, next) {
        passport.authenticate('local', async (err, user, info) => {
            if (err) return next(err);
            if (!user) {
                req.flash('error', info.message || 'Invalid credentials');
                return res.redirect('/auth/login');
            }

            // Check if email is verified
            if (!user.is_verified) {
                const code = generateCode();
                const expires = new Date(Date.now() + 10 * 60 * 1000);
                await pool.query(
                    'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
                    [code, expires, user.id]
                );
                try { await sendVerificationEmail(user.email, code); } catch (e) { console.error('Email send failed:', e.message); }
                req.session.pendingVerifyUserId = user.id;
                req.flash('error', 'Please verify your email first. A new code has been sent.');
                return res.redirect('/auth/verify');
            }

            // Check if 2FA is enabled
            if (user.totp_enabled) {
                req.session.pending2FAUserId = user.id;
                return res.redirect('/auth/2fa');
            }

            req.logIn(user, (err) => {
                if (err) return next(err);
                req.flash('success', 'Welcome back!');
                return res.redirect('/auth/dashboard');
            });
        })(req, res, next);
    },

    // GET /auth/register
    getRegister(req, res) {
        res.render('pages/register', {
            title: 'Register — EventKraft',
            googleEnabled: !!(process.env.GOOGLE_CLIENT_ID)
        });
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

            // Generate verification code
            const code = generateCode();
            const expires = new Date(Date.now() + 10 * 60 * 1000);
            await pool.query(
                'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
                [code, expires, user.id]
            );

            try {
                await sendVerificationEmail(email, code);
            } catch (e) {
                console.error('Email send failed (SMTP not configured?):', e.message);
            }

            req.session.pendingVerifyUserId = user.id;
            req.flash('success', 'Account created! Please check your email for the verification code.');
            res.redirect('/auth/verify');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Something went wrong. Please try again.');
            res.redirect('/auth/register');
        }
    },

    // GET /auth/verify
    getVerify(req, res) {
        if (!req.session.pendingVerifyUserId) {
            return res.redirect('/auth/login');
        }
        res.render('pages/verify-email', { title: 'Verify Your Email — EventKraft' });
    },

    // POST /auth/verify
    async postVerify(req, res) {
        try {
            const userId = req.session.pendingVerifyUserId;
            if (!userId) {
                req.flash('error', 'Session expired. Please register again.');
                return res.redirect('/auth/register');
            }

            const { code } = req.body;
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) {
                req.flash('error', 'User not found');
                return res.redirect('/auth/register');
            }

            const user = result.rows[0];

            if (user.verification_token !== code) {
                req.flash('error', 'Invalid verification code');
                return res.redirect('/auth/verify');
            }

            if (new Date() > new Date(user.verification_expires)) {
                req.flash('error', 'Code has expired. Please request a new one.');
                return res.redirect('/auth/verify');
            }

            await pool.query(
                'UPDATE users SET is_verified = true, verification_token = NULL, verification_expires = NULL WHERE id = $1',
                [userId]
            );

            delete req.session.pendingVerifyUserId;
            req.flash('success', 'Email verified! You can now log in.');
            res.redirect('/auth/login');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Verification failed. Please try again.');
            res.redirect('/auth/verify');
        }
    },

    // POST /auth/verify/resend
    async resendCode(req, res) {
        try {
            const userId = req.session.pendingVerifyUserId;
            if (!userId) return res.redirect('/auth/login');

            const result = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) return res.redirect('/auth/register');

            const code = generateCode();
            const expires = new Date(Date.now() + 10 * 60 * 1000);
            await pool.query(
                'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
                [code, expires, userId]
            );

            try {
                await sendVerificationEmail(result.rows[0].email, code);
                req.flash('success', 'New verification code sent!');
            } catch (e) {
                console.error('Email send failed:', e.message);
                req.flash('error', 'Failed to send email. Please try again.');
            }
            res.redirect('/auth/verify');
        } catch (err) {
            console.error(err);
            res.redirect('/auth/verify');
        }
    },

    // GET /auth/2fa
    get2FA(req, res) {
        if (!req.session.pending2FAUserId) return res.redirect('/auth/login');
        res.render('pages/verify-2fa', { title: 'Two-Factor Authentication — EventKraft' });
    },

    // POST /auth/2fa
    async post2FA(req, res) {
        try {
            const userId = req.session.pending2FAUserId;
            if (!userId) {
                req.flash('error', 'Session expired. Please log in again.');
                return res.redirect('/auth/login');
            }

            const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) return res.redirect('/auth/login');

            const user = result.rows[0];
            const { token } = req.body;

            const verified = speakeasy.totp.verify({
                secret: user.totp_secret, encoding: 'base32', token, window: 1
            });

            if (!verified) {
                req.flash('error', 'Invalid authentication code. Please try again.');
                return res.redirect('/auth/2fa');
            }

            delete req.session.pending2FAUserId;
            req.logIn(user, (err) => {
                if (err) { req.flash('error', 'Login failed'); return res.redirect('/auth/login'); }
                req.flash('success', 'Welcome back!');
                res.redirect('/auth/dashboard');
            });
        } catch (err) {
            console.error(err);
            req.flash('error', '2FA verification failed');
            res.redirect('/auth/2fa');
        }
    },

    // Google OAuth callback
    googleCallback(req, res) {
        req.flash('success', 'Welcome!');
        res.redirect('/auth/dashboard');
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
    },

    // GET /auth/settings
    async getSettings(req, res) {
        try {
            const user = await pool.query(
                'SELECT id, email, totp_enabled, google_id FROM users WHERE id = $1',
                [req.user.id]
            );
            const profile = await Profile.findByUserId(req.user.id);

            res.render('pages/settings', {
                title: 'Settings — EventKraft',
                userData: user.rows[0],
                profile
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load settings');
            res.redirect('/auth/dashboard');
        }
    },

    // POST /auth/settings/2fa/setup
    async setup2FA(req, res) {
        try {
            const secret = speakeasy.generateSecret({
                name: `EventKraft (${req.user.email})`, issuer: 'EventKraft'
            });
            req.session.tempTotpSecret = secret.base32;
            const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

            res.render('pages/setup-2fa', {
                title: 'Setup 2FA — EventKraft',
                qrCode: qrDataUrl,
                secret: secret.base32
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to generate 2FA setup');
            res.redirect('/auth/settings');
        }
    },

    // POST /auth/settings/2fa/verify
    async verify2FASetup(req, res) {
        try {
            const { token } = req.body;
            const tempSecret = req.session.tempTotpSecret;
            if (!tempSecret) {
                req.flash('error', 'Session expired. Please try again.');
                return res.redirect('/auth/settings');
            }

            const verified = speakeasy.totp.verify({
                secret: tempSecret, encoding: 'base32', token, window: 1
            });

            if (!verified) {
                req.flash('error', 'Invalid code. Please scan the QR code again.');
                return res.redirect('/auth/settings');
            }

            await pool.query(
                'UPDATE users SET totp_secret = $1, totp_enabled = true WHERE id = $2',
                [tempSecret, req.user.id]
            );
            delete req.session.tempTotpSecret;

            try {
                const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
                await send2FAEnabledEmail(userResult.rows[0].email);
            } catch (e) { /* graceful fail */ }

            req.flash('success', 'Two-factor authentication enabled successfully!');
            res.redirect('/auth/settings');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to enable 2FA');
            res.redirect('/auth/settings');
        }
    },

    // POST /auth/settings/2fa/disable
    async disable2FA(req, res) {
        try {
            await pool.query(
                'UPDATE users SET totp_secret = NULL, totp_enabled = false WHERE id = $1',
                [req.user.id]
            );
            req.flash('success', 'Two-factor authentication has been disabled.');
            res.redirect('/auth/settings');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to disable 2FA');
            res.redirect('/auth/settings');
        }
    }
};

// ── Worker Dashboard ────────────────────────────────────────
async function renderWorkerDashboard(req, res, userId, profile) {
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

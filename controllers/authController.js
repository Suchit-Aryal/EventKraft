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
                return res.redirect('/dashboard');
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
                res.redirect('/dashboard');
            });
        } catch (err) {
            console.error(err);
            req.flash('error', '2FA verification failed');
            res.redirect('/auth/2fa');
        }
    },

    // Google OAuth callback
    googleCallback(req, res) {
        if (!req.user.profile_complete) {
            return res.redirect('/onboarding/step1');
        }
        req.flash('success', 'Welcome!');
        res.redirect('/dashboard');
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
        // Redirect to new unified dashboard
        return res.redirect('/dashboard');
    },

    // GET /auth/settings  → redirect to unified dashboard settings
    async getSettings(req, res) {
        return res.redirect('/dashboard/settings');
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

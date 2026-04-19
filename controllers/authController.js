// ============================================================
// Auth Controller
// ============================================================

const passport = require('passport');
const User = require('../models/User');
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

            // Validation
            if (password !== confirmPassword) {
                req.flash('error', 'Passwords do not match');
                return res.redirect('/auth/register');
            }

            // Check if email exists
            const existing = await User.findByEmail(email);
            if (existing) {
                req.flash('error', 'Email is already registered');
                return res.redirect('/auth/register');
            }

            // Create user
            const user = await User.create({ email, phone, password, role });

            // Create profile entry
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

    // GET /auth/dashboard — redirect to role-specific dashboard
    getDashboard(req, res) {
        switch (req.user.role) {
            case 'admin':
                return res.redirect('/admin');
            case 'worker':
                return res.render('pages/worker-dashboard', { title: 'Worker Dashboard' });
            case 'customer':
            default:
                return res.render('pages/customer-dashboard', { title: 'Customer Dashboard' });
        }
    }
};

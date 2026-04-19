// ============================================================
// Auth Routes — /auth/*
// ============================================================

const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const { ensureGuest, ensureAuthenticated } = require('../middleware/auth');

// GET  /auth/login
router.get('/login', ensureGuest, authCtrl.getLogin);

// POST /auth/login
router.post('/login', authCtrl.postLogin);

// GET  /auth/register
router.get('/register', ensureGuest, authCtrl.getRegister);

// POST /auth/register
router.post('/register', authCtrl.postRegister);

// GET  /auth/logout
router.get('/logout', ensureAuthenticated, authCtrl.logout);

// GET  /auth/dashboard  (redirects to role-specific dashboard)
router.get('/dashboard', ensureAuthenticated, authCtrl.getDashboard);

module.exports = router;

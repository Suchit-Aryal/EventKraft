// ============================================================
// Admin Routes — /admin/*
// ============================================================

const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const { ensureAuthenticated } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roleCheck');

// All admin routes require admin role
router.use(ensureAuthenticated, ensureRole('admin'));

// GET  /admin             – Admin dashboard
router.get('/', adminCtrl.dashboard);

// GET  /admin/users       – Manage users
router.get('/users', adminCtrl.users);

// PUT  /admin/users/:id   – Update user (verify, activate/deactivate)
router.put('/users/:id', adminCtrl.updateUser);

// GET  /admin/bookings    – View all bookings
router.get('/bookings', adminCtrl.bookings);

// GET  /admin/disputes    – View disputes
router.get('/disputes', adminCtrl.disputes);

// PUT  /admin/disputes/:id – Resolve dispute
router.put('/disputes/:id', adminCtrl.resolveDispute);

// GET  /admin/commissions – Commission settings
router.get('/commissions', adminCtrl.commissions);

// PUT  /admin/commissions/:id – Update commission tier
router.put('/commissions/:id', adminCtrl.updateCommission);

module.exports = router;

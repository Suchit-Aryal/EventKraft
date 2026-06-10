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

// PUT  /admin/users/:id/role – Change a user's role
router.put('/users/:id/role', adminCtrl.updateUserRole);

// POST /admin/users/:id/reset-password – Reset a user's password
router.post('/users/:id/reset-password', adminCtrl.resetUserPassword);

// DELETE /admin/users/:id – Permanently delete a user
router.delete('/users/:id', adminCtrl.deleteUser);

// GET  /admin/bookings    – View all bookings
router.get('/bookings', adminCtrl.bookings);

// PUT  /admin/bookings/:id/status – Override booking status
router.put('/bookings/:id/status', adminCtrl.updateBookingStatus);

// GET  /admin/transactions – Financial ledger
router.get('/transactions', adminCtrl.transactions);

// ─── Categories ───────────────────────────────────────────────
router.get('/categories', adminCtrl.categories);
router.post('/categories', adminCtrl.createCategory);
router.put('/categories/:id', adminCtrl.updateCategory);

// ─── Review Moderation ────────────────────────────────────────
router.get('/reviews', adminCtrl.reviews);
router.put('/reviews/:id', adminCtrl.toggleReview);
router.delete('/reviews/:id', adminCtrl.deleteReview);

// GET  /admin/services    – Manage all gigs/services
router.get('/services', adminCtrl.services);

// PUT  /admin/services/:id – Update gig status
router.put('/services/:id', adminCtrl.updateService);

// GET  /admin/jobs        – Manage all job postings
router.get('/jobs', adminCtrl.jobs);

// PUT  /admin/jobs/:id    – Update job status
router.put('/jobs/:id', adminCtrl.updateJob);

// GET  /admin/disputes    – View disputes
router.get('/disputes', adminCtrl.disputes);

// PUT  /admin/disputes/:id – Resolve dispute
router.put('/disputes/:id', adminCtrl.resolveDispute);

// GET  /admin/commissions – Commission settings
router.get('/commissions', adminCtrl.commissions);

// PUT  /admin/commissions/:id – Update commission tier
router.put('/commissions/:id', adminCtrl.updateCommission);

// ─── KYC Management ───────────────────────────────────────────

// GET /admin/kyc — list all KYC submissions
router.get('/kyc', adminCtrl.kycList);

// POST /admin/kyc/:userId/approve
router.post('/kyc/:userId/approve', adminCtrl.approveKyc);

// POST /admin/kyc/:userId/reject
router.post('/kyc/:userId/reject', adminCtrl.rejectKyc);

// ─── Legal Action Panel ────────────────────────────────────────

// GET /admin/legal-action — overdue/legal action bookings
router.get('/legal-action', adminCtrl.legalAction);

// POST /admin/bookings/:id/legal-action — mark as legal action
router.post('/bookings/:id/legal-action', adminCtrl.markLegalAction);

// POST /admin/bookings/:id/resolve — mark as resolved/completed
router.post('/bookings/:id/resolve', adminCtrl.resolveOverdue);

module.exports = router;

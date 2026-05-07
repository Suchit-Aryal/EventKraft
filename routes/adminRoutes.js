// ============================================================
// Admin Routes — /admin/*
// ============================================================

const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const { ensureAuthenticated } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roleCheck');
const pool = require('../config/db');
const { createNotification } = require('../utils/notify');

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

// ─── KYC Management ───────────────────────────────────────────

// GET /admin/kyc — list all KYC submissions
router.get('/kyc', async (req, res) => {
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
    res.render('admin/kyc-list', { submissions: rows });
  } catch (err) {
    console.error('Admin KYC list error:', err);
    req.flash('error', 'Could not load KYC submissions.');
    res.redirect('/admin');
  }
});

// POST /admin/kyc/:userId/approve
router.post('/kyc/:userId/approve', async (req, res) => {
  try {
    const { userId } = req.params;
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
});

// POST /admin/kyc/:userId/reject
router.post('/kyc/:userId/reject', async (req, res) => {
  try {
    const { userId } = req.params;
    const reason = req.body.reason?.trim()
      || 'Your document could not be verified. Please resubmit with a clearer image.';
    await pool.query(`UPDATE users SET kyc_status = 'rejected' WHERE id = $1`, [userId]);
    await pool.query(
      `UPDATE kyc_submissions
       SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW(), reviewed_by = $2
       WHERE user_id = $3`,
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
});

module.exports = router;

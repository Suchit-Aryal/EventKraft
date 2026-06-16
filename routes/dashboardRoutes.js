// ============================================================
// Dashboard Routes — Profile, KYC, Settings, Overview
// ============================================================

const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const profileController = require('../controllers/profileController');
const pool = require('../config/db');
const recommendationService = require('../utils/recommendationService');

// All dashboard routes require authentication
router.use(ensureAuthenticated);

// ─── GET /dashboard ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let stats = {};
    let jobs = [];
    let bookings = [];
    let gigs = [];
    let recommendations = [];

    if (role === 'customer') {
      const statsQ = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM job_postings WHERE customer_id = $1 AND status = 'published') AS active_jobs,
          (SELECT COUNT(*) FROM proposals pr JOIN job_postings jp ON pr.job_id = jp.id
            WHERE jp.customer_id = $1 AND pr.status = 'pending') AS pending_proposals,
          (SELECT COUNT(*) FROM bookings WHERE customer_id = $1) AS total_bookings,
          (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE customer_id = $1 AND status IN ('completed', 'paid_final')) AS total_spent`,
        [userId]
      );
      stats = statsQ.rows[0] || {};

      const jobsQ = await pool.query(
        `SELECT jp.*, c.name AS category_name,
                (SELECT COUNT(*) FROM proposals WHERE job_id = jp.id) AS proposal_count
         FROM job_postings jp
         LEFT JOIN categories c ON jp.category_id = c.id
         WHERE jp.customer_id = $1 ORDER BY jp.created_at DESC LIMIT 5`,
        [userId]
      );
      jobs = jobsQ.rows;

      const bookingsQ = await pool.query(
        `SELECT b.*, COALESCE(sg.title, jp.title) AS gig_title,
                p.first_name || ' ' || p.last_name AS worker_name
         FROM bookings b
         LEFT JOIN service_gigs sg ON sg.id = b.gig_id
         LEFT JOIN job_postings jp ON jp.id = b.job_id
         LEFT JOIN profiles p ON p.user_id = b.worker_id
         WHERE b.customer_id = $1 ORDER BY b.created_at DESC LIMIT 5`,
        [userId]
      );
      bookings = bookingsQ.rows;

      recommendations = await recommendationService.forCustomer(userId, 8);
    } else if (role === 'worker') {
      const statsQ = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM service_gigs WHERE worker_id = $1 AND status = 'active') AS active_gigs,
          (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'pending') AS pending_bookings,
          (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status IN ('completed', 'paid_final')) AS completed,
          (SELECT COALESCE(SUM(worker_earning), 0) FROM bookings WHERE worker_id = $1 AND status IN ('completed', 'paid_final')) AS total_earned`,
        [userId]
      );
      stats = statsQ.rows[0] || {};

      const gigsQ = await pool.query(
        `SELECT sg.*, c.name AS category_name
         FROM service_gigs sg
         LEFT JOIN categories c ON sg.category_id = c.id
         WHERE sg.worker_id = $1 ORDER BY sg.created_at DESC LIMIT 5`,
        [userId]
      );
      gigs = gigsQ.rows;

      const workerBookingsQ = await pool.query(
        `SELECT b.*, COALESCE(sg.title, jp.title) AS gig_title,
                p.first_name || ' ' || p.last_name AS customer_name
         FROM bookings b
         LEFT JOIN service_gigs sg ON sg.id = b.gig_id
         LEFT JOIN job_postings jp ON jp.id = b.job_id
         LEFT JOIN profiles p ON p.user_id = b.customer_id
         WHERE b.worker_id = $1 ORDER BY b.created_at DESC LIMIT 5`,
        [userId]
      );
      bookings = workerBookingsQ.rows;

      recommendations = await recommendationService.forWorker(userId, 8);
    }

    res.render('pages/dashboard-overview', {
      pageTitle: 'Dashboard',
      activePage: 'overview',
      stats, jobs, bookings, gigs, recommendations,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.flash('error', 'Could not load dashboard');
    res.redirect('/');
  }
});

// ─── Profile ────────────────────────────────────────────────
router.get('/profile', profileController.editPage);
router.post('/profile', profileController.save);
router.post('/portfolio/:id/delete', profileController.deletePortfolioItem);

// ─── KYC ────────────────────────────────────────────────────
router.get('/kyc', profileController.kycPage);
router.post('/kyc/submit', profileController.kycSubmit);

// ─── Settings ───────────────────────────────────────────────
router.get('/settings', profileController.settingsPage);
router.post('/settings/contact', profileController.saveContact);
router.post('/settings/password', profileController.changePassword);
router.post('/settings/notifications', profileController.saveNotifications);
router.post('/settings/privacy', profileController.savePrivacy);
router.post('/settings/deactivate', profileController.deactivateAccount);
router.post('/settings/delete', profileController.deleteAccount);

// ─── Notifications ────────────────────────────────────────────
router.get('/notifications', profileController.notificationsPage);
router.get('/notifications/api/recent', profileController.getRecentNotificationsApi);
router.post('/notifications/api/mark-all-read', profileController.markAllAsReadApi);

module.exports = router;

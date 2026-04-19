// ============================================================
// Job Routes — /jobs/*
// ============================================================

const express = require('express');
const router = express.Router();
const jobCtrl = require('../controllers/jobController');
const { ensureAuthenticated } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roleCheck');

// GET  /jobs          – Browse all published jobs
router.get('/', jobCtrl.index);

// GET  /jobs/create   – Show create form (customers only)
router.get('/create', ensureAuthenticated, ensureRole('customer'), jobCtrl.create);

// POST /jobs          – Submit new job posting
router.post('/', ensureAuthenticated, ensureRole('customer'), jobCtrl.store);

// GET  /jobs/:id      – View single job
router.get('/:id', jobCtrl.show);

// PUT  /jobs/:id      – Update job
router.put('/:id', ensureAuthenticated, ensureRole('customer'), jobCtrl.update);

// DELETE /jobs/:id    – Delete / cancel job
router.delete('/:id', ensureAuthenticated, ensureRole('customer'), jobCtrl.destroy);

module.exports = router;

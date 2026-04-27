// ============================================================
// Gig Routes — /gigs/*
// ============================================================

const express = require('express');
const router = express.Router();
const gigCtrl = require('../controllers/gigController');
const { ensureAuthenticated } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roleCheck');

// GET  /gigs/api/search  – JSON autocomplete results
router.get('/api/search', gigCtrl.apiSearch);

// GET  /gigs          – Browse all active gigs
router.get('/', gigCtrl.index);

// GET  /gigs/create   – Show create form (workers only)
router.get('/create', ensureAuthenticated, ensureRole('worker'), gigCtrl.create);

// POST /gigs          – Submit new gig
router.post('/', ensureAuthenticated, ensureRole('worker'), gigCtrl.store);

// GET  /gigs/:id      – View single gig
router.get('/:id', gigCtrl.show);

// PUT  /gigs/:id      – Update gig
router.put('/:id', ensureAuthenticated, ensureRole('worker'), gigCtrl.update);

// DELETE /gigs/:id    – Delete gig
router.delete('/:id', ensureAuthenticated, ensureRole('worker'), gigCtrl.destroy);

module.exports = router;

// ============================================================
// Booking Routes — /bookings/*
// ============================================================

const express = require('express');
const router = express.Router();
const bookingCtrl = require('../controllers/bookingController');
const { ensureAuthenticated } = require('../middleware/auth');

// GET  /bookings       – List user's bookings
router.get('/', ensureAuthenticated, bookingCtrl.index);

// POST /bookings       – Create a new booking
router.post('/', ensureAuthenticated, bookingCtrl.store);

// GET  /bookings/:id   – View booking details
router.get('/:id', ensureAuthenticated, bookingCtrl.show);

// PUT  /bookings/:id   – Update booking status
router.put('/:id', ensureAuthenticated, bookingCtrl.update);

// POST /bookings/:id/accept   – Worker accepts booking
router.post('/:id/accept', ensureAuthenticated, bookingCtrl.accept);

// POST /bookings/:id/complete – Customer marks completed
router.post('/:id/complete', ensureAuthenticated, bookingCtrl.complete);

// POST /bookings/:id/cancel   – Cancel booking
router.post('/:id/cancel', ensureAuthenticated, bookingCtrl.cancel);

module.exports = router;

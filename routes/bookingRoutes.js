// ============================================================
// Booking Routes — /bookings/*
// ============================================================

const express = require('express');
const router = express.Router();
const bookingCtrl = require('../controllers/bookingController');
const Booking = require('../models/Booking');
const { ensureAuthenticated } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roleCheck');

async function ensureBookingCustomer(req, res, next) {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/dashboard');
        }
        if (booking.customer_id !== req.user.id) {
            return res.status(403).send('Forbidden');
        }
        req.booking = booking;
        next();
    } catch (err) {
        next(err);
    }
}

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

// POST /bookings/:id/decision – Worker accepts/declines from booking card
router.post('/:id/decision', ensureAuthenticated, bookingCtrl.decide);

// GET: Show legal agreement page
router.get('/:id/agreement', ensureAuthenticated, ensureRole('customer'), bookingCtrl.showAgreement);

// POST: Accept agreement
router.post('/:id/agreement', ensureAuthenticated, ensureRole('customer'), bookingCtrl.acceptAgreement);

// eSewa Advance Payment
router.get('/:id/pay-advance', ensureAuthenticated, ensureRole('customer'), bookingCtrl.showAdvancePayment);
router.get('/:id/payment/advance/success', ensureAuthenticated, ensureRole('customer'), ensureBookingCustomer, bookingCtrl.handleAdvanceSuccess);
router.get('/:id/payment/advance/failure', ensureAuthenticated, ensureRole('customer'), ensureBookingCustomer, bookingCtrl.handleAdvanceFailure);

// Worker Completion with proof upload
const upload = require('../middleware/upload');
router.post('/:id/submit-complete', ensureAuthenticated, ensureRole('worker'), upload.array('completion_proof', 5), bookingCtrl.submitCompletion);

// Final Payment
router.get('/:id/pay-final', ensureAuthenticated, ensureRole('customer'), bookingCtrl.showFinalPayment);
router.get('/:id/payment/final/success', ensureAuthenticated, ensureRole('customer'), ensureBookingCustomer, bookingCtrl.handleFinalSuccess);
router.get('/:id/payment/final/failure', ensureAuthenticated, ensureRole('customer'), ensureBookingCustomer, bookingCtrl.handleFinalFailure);

// Dispute
router.post('/:id/dispute', ensureAuthenticated, ensureRole('customer'), bookingCtrl.raiseDispute);

module.exports = router;

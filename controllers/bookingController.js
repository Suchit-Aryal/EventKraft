// ============================================================
// Booking Controller
// ============================================================

const Booking = require('../models/Booking');

module.exports = {

    async index(req, res) {
        try {
            let bookings;
            if (req.user.role === 'customer') {
                bookings = await Booking.findByCustomer(req.user.id);
            } else {
                bookings = await Booking.findByWorker(req.user.id);
            }
            res.render('pages/bookings', { title: 'My Bookings', bookings });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load bookings');
            res.redirect('/auth/dashboard');
        }
    },

    async store(req, res) {
        try {
            const booking = await Booking.create({ ...req.body, customer_id: req.user.id });
            req.flash('success', 'Booking created! The worker will be notified.');
            res.redirect(`/bookings/${booking.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to create booking');
            res.redirect('back');
        }
    },

    async show(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).render('pages/404', { title: 'Booking Not Found' });
            res.render('pages/booking-detail', { title: 'Booking Details', booking });
        } catch (err) {
            console.error(err);
            res.redirect('/bookings');
        }
    },

    async update(req, res) {
        try {
            await Booking.updateStatus(req.params.id, req.body.status);
            req.flash('success', 'Booking updated');
            res.redirect(`/bookings/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to update booking');
            res.redirect(`/bookings/${req.params.id}`);
        }
    },

    async accept(req, res) {
        try {
            await Booking.accept(req.params.id);
            req.flash('success', 'Booking accepted!');
            res.redirect(`/bookings/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to accept booking');
            res.redirect(`/bookings/${req.params.id}`);
        }
    },

    async complete(req, res) {
        try {
            await Booking.complete(req.params.id);
            req.flash('success', 'Booking marked as completed!');
            res.redirect(`/bookings/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to complete booking');
            res.redirect(`/bookings/${req.params.id}`);
        }
    },

    async cancel(req, res) {
        try {
            await Booking.cancel(req.params.id);
            req.flash('success', 'Booking cancelled');
            res.redirect(`/bookings/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to cancel booking');
            res.redirect(`/bookings/${req.params.id}`);
        }
    }
};

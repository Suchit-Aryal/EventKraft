// ============================================================
// Review Controller
// ============================================================

const Review = require('../models/Review');
const Booking = require('../models/Booking');

module.exports = {

    async store(req, res) {
        try {
            const { booking_id, rating, quality_rating, professionalism_rating,
                    communication_rating, value_rating, timeliness_rating, comment } = req.body;

            if (!booking_id || !rating) {
                req.flash('error', 'Booking and rating are required');
                return res.redirect('back');
            }

            const booking = await Booking.findById(booking_id);
            if (!booking) {
                req.flash('error', 'Booking not found');
                return res.redirect('back');
            }
            if (booking.customer_id !== req.user.id && booking.worker_id !== req.user.id) {
                req.flash('error', 'You can only review bookings you are part of');
                return res.redirect('back');
            }

            const reviewee_id = req.user.id === booking.customer_id
                ? booking.worker_id
                : booking.customer_id;

            await Review.create({
                booking_id,
                reviewer_id: req.user.id,
                reviewee_id,
                rating: Number(rating),
                quality_rating: quality_rating ? Number(quality_rating) : null,
                professionalism_rating: professionalism_rating ? Number(professionalism_rating) : null,
                communication_rating: communication_rating ? Number(communication_rating) : null,
                value_rating: value_rating ? Number(value_rating) : null,
                timeliness_rating: timeliness_rating ? Number(timeliness_rating) : null,
                comment: comment || null,
            });
            req.flash('success', 'Review submitted!');
            res.redirect('back');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to submit review');
            res.redirect('back');
        }
    },

    async userReviews(req, res) {
        try {
            const reviews = await Review.findByReviewee(req.params.id);
            res.render('pages/reviews', { title: 'Reviews', reviews });
        } catch (err) {
            console.error(err);
            res.redirect('/');
        }
    }
};

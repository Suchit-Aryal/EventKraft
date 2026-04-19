// ============================================================
// Review Controller
// ============================================================

const Review = require('../models/Review');

module.exports = {

    async store(req, res) {
        try {
            await Review.create({ ...req.body, reviewer_id: req.user.id });
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

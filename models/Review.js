// ============================================================
// Review Model — Full CRUD for reviews table
// ============================================================

const pool = require('../config/db');

const Review = {

    // ─── CREATE ─────────────────────────────────────────────

    async create(data) {
        const result = await pool.query(
            `INSERT INTO reviews
             (booking_id, reviewer_id, reviewee_id, rating,
              quality_rating, professionalism_rating, communication_rating,
              value_rating, timeliness_rating, comment)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING *`,
            [
                data.booking_id, data.reviewer_id, data.reviewee_id,
                data.rating, data.quality_rating, data.professionalism_rating,
                data.communication_rating, data.value_rating,
                data.timeliness_rating, data.comment
            ]
        );

        // Auto-update the reviewee's profile avg_rating
        await pool.query(
            `UPDATE profiles SET
                avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE reviewee_id = $1), 0),
                total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1)
             WHERE user_id = $1`,
            [data.reviewee_id]
        );

        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────

    async findByBooking(bookingId) {
        const result = await pool.query(
            `SELECT r.*, 
                    p.first_name AS reviewer_first_name, p.last_name AS reviewer_last_name,
                    p.avatar_url AS reviewer_avatar
             FROM reviews r
             JOIN profiles p ON r.reviewer_id = p.user_id
             WHERE r.booking_id = $1`,
            [bookingId]
        );
        return result.rows;
    },

    async findByReviewee(revieweeId) {
        const result = await pool.query(
            `SELECT r.*,
                    p.first_name AS reviewer_first_name, p.last_name AS reviewer_last_name,
                    p.avatar_url AS reviewer_avatar
             FROM reviews r
             JOIN profiles p ON r.reviewer_id = p.user_id
             WHERE r.reviewee_id = $1 AND r.is_public = true
             ORDER BY r.created_at DESC`,
            [revieweeId]
        );
        return result.rows;
    },

    // Check if user already reviewed this booking
    async hasReviewed(bookingId, reviewerId) {
        const result = await pool.query(
            'SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
            [bookingId, reviewerId]
        );
        return result.rows.length > 0;
    },

    // Get rating breakdown for a user
    async getRatingSummary(revieweeId) {
        const result = await pool.query(
            `SELECT
                ROUND(AVG(rating)::numeric, 2) AS overall,
                ROUND(AVG(quality_rating)::numeric, 2) AS quality,
                ROUND(AVG(professionalism_rating)::numeric, 2) AS professionalism,
                ROUND(AVG(communication_rating)::numeric, 2) AS communication,
                ROUND(AVG(value_rating)::numeric, 2) AS value,
                ROUND(AVG(timeliness_rating)::numeric, 2) AS timeliness,
                COUNT(*) AS total
             FROM reviews
             WHERE reviewee_id = $1 AND is_public = true`,
            [revieweeId]
        );
        return result.rows[0];
    },

    // ─── UPDATE ─────────────────────────────────────────────

    // Worker responds to a review
    async addResponse(reviewId, response) {
        await pool.query(
            'UPDATE reviews SET response = $1 WHERE id = $2',
            [response, reviewId]
        );
    },

    async setVisibility(reviewId, isPublic) {
        await pool.query(
            'UPDATE reviews SET is_public = $1 WHERE id = $2',
            [isPublic, reviewId]
        );
    },

    // ─── DELETE ─────────────────────────────────────────────

    async delete(id) {
        // Get reviewee before deleting so we can update their rating
        const review = await pool.query('SELECT reviewee_id FROM reviews WHERE id = $1', [id]);
        await pool.query('DELETE FROM reviews WHERE id = $1', [id]);

        // Recalculate rating after deletion
        if (review.rows[0]) {
            await pool.query(
                `UPDATE profiles SET
                    avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE reviewee_id = $1), 0),
                    total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1)
                 WHERE user_id = $1`,
                [review.rows[0].reviewee_id]
            );
        }
    }
};

module.exports = Review;

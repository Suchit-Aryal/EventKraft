// ============================================================
// Profile Model — Extended user info (one-to-one with users)
// ============================================================

const pool = require('../config/db');

const Profile = {

    // ─── CREATE ─────────────────────────────────────────────
    async create({ user_id, first_name, last_name }) {
        const result = await pool.query(
            `INSERT INTO profiles (user_id, first_name, last_name)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [user_id, first_name, last_name]
        );
        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────
    async findByUserId(userId) {
        const result = await pool.query(
            `SELECT p.*, u.email, u.phone, u.role, u.is_verified, u.is_active
             FROM profiles p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = $1`,
            [userId]
        );
        return result.rows[0];
    },

    async findById(id) {
        const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [id]);
        return result.rows[0];
    },

    // Get full public profile (used on profile pages)
    async getPublicProfile(userId) {
        const result = await pool.query(
            `SELECT 
                p.first_name, p.last_name, p.avatar_url, p.cover_photo_url,
                p.bio, p.city, p.social_links, p.avg_rating, p.total_reviews,
                p.total_completed, p.is_admin_verified,
                u.email, u.role, u.created_at AS member_since
             FROM profiles p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = $1 AND u.is_active = true`,
            [userId]
        );
        return result.rows[0];
    },

    // ─── UPDATE ─────────────────────────────────────────────
    async update(userId, data) {
        const result = await pool.query(
            `UPDATE profiles SET
                first_name = COALESCE($2, first_name),
                last_name = COALESCE($3, last_name),
                avatar_url = COALESCE($4, avatar_url),
                cover_photo_url = COALESCE($5, cover_photo_url),
                bio = COALESCE($6, bio),
                city = COALESCE($7, city),
                address = COALESCE($8, address),
                date_of_birth = COALESCE($9, date_of_birth),
                gender = COALESCE($10, gender),
                social_links = COALESCE($11, social_links)
             WHERE user_id = $1
             RETURNING *`,
            [
                userId, data.first_name, data.last_name,
                data.avatar_url, data.cover_photo_url,
                data.bio, data.city, data.address,
                data.date_of_birth, data.gender,
                data.social_links ? JSON.stringify(data.social_links) : null
            ]
        );
        return result.rows[0];
    },

    async updateAvatar(userId, avatarUrl) {
        await pool.query(
            'UPDATE profiles SET avatar_url = $1 WHERE user_id = $2',
            [avatarUrl, userId]
        );
    },

    async updateRating(userId) {
        // Recalculate average rating from reviews table
        await pool.query(
            `UPDATE profiles SET
                avg_rating = COALESCE((
                    SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE reviewee_id = $1
                ), 0),
                total_reviews = (
                    SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1
                )
             WHERE user_id = $1`,
            [userId]
        );
    },

    async incrementCompleted(userId) {
        await pool.query(
            'UPDATE profiles SET total_completed = total_completed + 1 WHERE user_id = $1',
            [userId]
        );
    },

    async setAdminVerified(userId, verified) {
        await pool.query(
            'UPDATE profiles SET is_admin_verified = $1 WHERE user_id = $2',
            [verified, userId]
        );
    },

    async uploadVerificationDocs(userId, docs) {
        await pool.query(
            'UPDATE profiles SET verification_docs = $1 WHERE user_id = $2',
            [JSON.stringify(docs), userId]
        );
    },

    // ─── DELETE ─────────────────────────────────────────────
    async delete(userId) {
        await pool.query('DELETE FROM profiles WHERE user_id = $1', [userId]);
    }
};

module.exports = Profile;

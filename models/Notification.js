// ============================================================
// Notification Model — In-app notifications
// ============================================================

const pool = require('../config/db');

const Notification = {

    // ─── CREATE ─────────────────────────────────────────────
    async create({ user_id, type, title, message, link }) {
        const result = await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [user_id, type, title, message || null, link || null]
        );
        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────

    async findByUser(userId, limit = 20) {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
            [userId, limit]
        );
        return result.rows;
    },

    async getUnreadCount(userId) {
        const result = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
            [userId]
        );
        return parseInt(result.rows[0].count);
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async markAsRead(id) {
        await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    },

    async markAllAsRead(userId) {
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
            [userId]
        );
    },

    // ─── DELETE ─────────────────────────────────────────────

    async delete(id) {
        await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    },

    async deleteAllRead(userId) {
        await pool.query(
            'DELETE FROM notifications WHERE user_id = $1 AND is_read = true',
            [userId]
        );
    }
};

module.exports = Notification;

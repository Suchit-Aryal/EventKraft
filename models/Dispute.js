// ============================================================
// Dispute Model — Dispute records
// ============================================================

const pool = require('../config/db');

const Dispute = {

    // ─── CREATE ─────────────────────────────────────────────
    async create({ booking_id, raised_by, reason, evidence }) {
        // Also update the booking status to 'disputed'
        await pool.query(
            "UPDATE bookings SET status = 'disputed' WHERE id = $1",
            [booking_id]
        );

        const result = await pool.query(
            `INSERT INTO disputes (booking_id, raised_by, reason, evidence, status)
             VALUES ($1, $2, $3, $4, 'open')
             RETURNING *`,
            [booking_id, raised_by, reason, JSON.stringify(evidence || [])]
        );
        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────

    async findById(id) {
        const result = await pool.query(
            `SELECT d.*,
                b.total_amount, b.event_date, b.status AS booking_status,
                raiser_p.first_name AS raiser_name,
                raiser.email AS raiser_email
             FROM disputes d
             JOIN bookings b ON d.booking_id = b.id
             JOIN users raiser ON d.raised_by = raiser.id
             JOIN profiles raiser_p ON d.raised_by = raiser_p.user_id
             WHERE d.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    async findAll(status = null) {
        let query = `
            SELECT d.*, 
                b.total_amount, b.customer_id, b.worker_id,
                raiser_p.first_name AS raiser_name
            FROM disputes d
            JOIN bookings b ON d.booking_id = b.id
            JOIN profiles raiser_p ON d.raised_by = raiser_p.user_id
        `;
        const params = [];

        if (status) {
            query += ' WHERE d.status = $1';
            params.push(status);
        }
        query += ' ORDER BY d.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    async findByUser(userId) {
        const result = await pool.query(
            `SELECT d.*, b.total_amount
             FROM disputes d
             JOIN bookings b ON d.booking_id = b.id
             WHERE d.raised_by = $1 OR b.customer_id = $1 OR b.worker_id = $1
             ORDER BY d.created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async resolve({ id, status, resolution, resolved_by }) {
        const result = await pool.query(
            `UPDATE disputes SET 
                status = $1, resolution = $2, 
                resolved_by = $3, resolved_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [status, resolution, resolved_by, id]
        );
        return result.rows[0];
    },

    async setUnderReview(id) {
        await pool.query(
            "UPDATE disputes SET status = 'under_review' WHERE id = $1",
            [id]
        );
    }
};

module.exports = Dispute;

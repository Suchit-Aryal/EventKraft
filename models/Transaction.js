// ============================================================
// Transaction Model — Financial records
// ============================================================

const pool = require('../config/db');

const Transaction = {

    // ─── CREATE ─────────────────────────────────────────────
    async create(data) {
        const result = await pool.query(
            `INSERT INTO transactions
             (booking_id, payer_id, payee_id, amount, commission,
              net_amount, type, status, payment_method)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING *`,
            [
                data.booking_id, data.payer_id, data.payee_id,
                data.amount, data.commission, data.net_amount,
                data.type, data.status || 'pending', data.payment_method
            ]
        );
        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────

    async findById(id) {
        const result = await pool.query(
            `SELECT t.*, 
                payer.email AS payer_email, payee.email AS payee_email
             FROM transactions t
             JOIN users payer ON t.payer_id = payer.id
             JOIN users payee ON t.payee_id = payee.id
             WHERE t.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    async findByBooking(bookingId) {
        const result = await pool.query(
            'SELECT * FROM transactions WHERE booking_id = $1 ORDER BY created_at DESC',
            [bookingId]
        );
        return result.rows;
    },

    // Get all transactions for a user (as payer or payee)
    async findByUser(userId) {
        const result = await pool.query(
            `SELECT t.*, b.total_amount AS booking_total
             FROM transactions t
             JOIN bookings b ON t.booking_id = b.id
             WHERE t.payer_id = $1 OR t.payee_id = $1
             ORDER BY t.created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    // Worker earnings summary
    async getWorkerEarnings(workerId) {
        const result = await pool.query(
            `SELECT 
                COUNT(*) AS total_transactions,
                COALESCE(SUM(net_amount), 0) AS total_earned,
                COALESCE(SUM(commission), 0) AS total_commission,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END), 0) AS paid_out,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END), 0) AS pending
             FROM transactions
             WHERE payee_id = $1 AND type = 'payment'`,
            [workerId]
        );
        return result.rows[0];
    },

    // Platform revenue (admin)
    async getPlatformRevenue() {
        const result = await pool.query(
            `SELECT 
                COUNT(*) AS total_transactions,
                COALESCE(SUM(amount), 0) AS total_volume,
                COALESCE(SUM(commission), 0) AS total_commission,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN commission ELSE 0 END), 0) AS collected_commission
             FROM transactions
             WHERE type = 'payment'`
        );
        return result.rows[0];
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async updateStatus(id, status) {
        const result = await pool.query(
            'UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0];
    },

    async markCompleted(id) {
        return this.updateStatus(id, 'completed');
    },

    async markRefunded(id) {
        return this.updateStatus(id, 'refunded');
    }
};

module.exports = Transaction;

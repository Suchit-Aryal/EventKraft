// ============================================================
// CommissionSetting Model — Admin-configurable commission rates
// ============================================================

const pool = require('../config/db');

const CommissionSetting = {

    // ─── READ ───────────────────────────────────────────────

    async findAll() {
        const result = await pool.query(
            'SELECT * FROM commission_settings WHERE is_active = true ORDER BY min_amount'
        );
        return result.rows;
    },

    async findById(id) {
        const result = await pool.query('SELECT * FROM commission_settings WHERE id = $1', [id]);
        return result.rows[0];
    },

    // Calculate commission rate for a given amount
    async getRateForAmount(amount) {
        const result = await pool.query(
            `SELECT rate FROM commission_settings
             WHERE is_active = true
               AND min_amount <= $1
               AND (max_amount IS NULL OR max_amount >= $1)
             ORDER BY min_amount DESC
             LIMIT 1`,
            [amount]
        );
        return result.rows.length > 0 ? parseFloat(result.rows[0].rate) : 10.00; // default 10%
    },

    // Calculate commission breakdown for a booking amount
    async calculateCommission(totalAmount) {
        const rate = await this.getRateForAmount(totalAmount);
        const commissionAmount = (totalAmount * rate) / 100;
        const workerEarning = totalAmount - commissionAmount;

        return {
            total_amount: totalAmount,
            commission_rate: rate,
            commission_amount: parseFloat(commissionAmount.toFixed(2)),
            worker_earning: parseFloat(workerEarning.toFixed(2))
        };
    },

    // ─── CREATE ─────────────────────────────────────────────

    async create({ tier_name, min_amount, max_amount, rate, updated_by }) {
        const result = await pool.query(
            `INSERT INTO commission_settings (tier_name, min_amount, max_amount, rate, updated_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [tier_name, min_amount, max_amount || null, rate, updated_by]
        );
        return result.rows[0];
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async update(id, { rate, is_active, updated_by }) {
        const result = await pool.query(
            `UPDATE commission_settings SET
                rate = COALESCE($2, rate),
                is_active = COALESCE($3, is_active),
                updated_by = $4
             WHERE id = $1
             RETURNING *`,
            [id, rate, is_active, updated_by]
        );
        return result.rows[0];
    }
};

module.exports = CommissionSetting;

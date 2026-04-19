// ============================================================
// Booking Model — Full CRUD for bookings table
// ============================================================

const pool = require('../config/db');

const Booking = {

    // ─── CREATE ─────────────────────────────────────────────

    async create(data) {
        const result = await pool.query(
            `INSERT INTO bookings
             (customer_id, worker_id, gig_id, job_id, package_id,
              total_amount, commission_rate, commission_amount, worker_earning,
              event_date, event_location, requirements, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [
                data.customer_id, data.worker_id, data.gig_id || null,
                data.job_id || null, data.package_id || null,
                data.total_amount, data.commission_rate,
                data.commission_amount, data.worker_earning,
                data.event_date, data.event_location,
                data.requirements, data.status || 'pending'
            ]
        );
        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────

    async findById(id) {
        const result = await pool.query(
            `SELECT b.*,
                    cp.first_name AS customer_first_name, cp.last_name AS customer_last_name,
                    wp.first_name AS worker_first_name, wp.last_name AS worker_last_name,
                    wp.avatar_url AS worker_avatar,
                    sg.title AS gig_title, jp.title AS job_title
             FROM bookings b
             LEFT JOIN profiles cp ON b.customer_id = cp.user_id
             LEFT JOIN profiles wp ON b.worker_id = wp.user_id
             LEFT JOIN service_gigs sg ON b.gig_id = sg.id
             LEFT JOIN job_postings jp ON b.job_id = jp.id
             WHERE b.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    async findByCustomer(customerId) {
        const result = await pool.query(
            `SELECT b.*,
                    wp.first_name AS worker_first_name, wp.last_name AS worker_last_name,
                    wp.avatar_url AS worker_avatar,
                    sg.title AS gig_title, jp.title AS job_title
             FROM bookings b
             LEFT JOIN profiles wp ON b.worker_id = wp.user_id
             LEFT JOIN service_gigs sg ON b.gig_id = sg.id
             LEFT JOIN job_postings jp ON b.job_id = jp.id
             WHERE b.customer_id = $1
             ORDER BY b.created_at DESC`,
            [customerId]
        );
        return result.rows;
    },

    async findByWorker(workerId) {
        const result = await pool.query(
            `SELECT b.*,
                    cp.first_name AS customer_first_name, cp.last_name AS customer_last_name,
                    sg.title AS gig_title, jp.title AS job_title
             FROM bookings b
             LEFT JOIN profiles cp ON b.customer_id = cp.user_id
             LEFT JOIN service_gigs sg ON b.gig_id = sg.id
             LEFT JOIN job_postings jp ON b.job_id = jp.id
             WHERE b.worker_id = $1
             ORDER BY b.created_at DESC`,
            [workerId]
        );
        return result.rows;
    },

    async findAll(status = null) {
        let query = `
            SELECT b.*,
                   cp.first_name AS customer_name, wp.first_name AS worker_name
            FROM bookings b
            LEFT JOIN profiles cp ON b.customer_id = cp.user_id
            LEFT JOIN profiles wp ON b.worker_id = wp.user_id
        `;
        const params = [];
        if (status) { query += ' WHERE b.status = $1'; params.push(status); }
        query += ' ORDER BY b.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async updateStatus(id, status) {
        const result = await pool.query(
            'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0];
    },

    async complete(id) {
        const result = await pool.query(
            "UPDATE bookings SET status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *",
            [id]
        );
        return result.rows[0];
    },

    async accept(id) {
        return this.updateStatus(id, 'accepted');
    },

    async cancel(id) {
        return this.updateStatus(id, 'cancelled');
    },

    // ─── DELETE ─────────────────────────────────────────────

    async delete(id) {
        await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
    },

    // ─── STATS ──────────────────────────────────────────────

    async getStats() {
        const result = await pool.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
                COUNT(*) FILTER (WHERE status = 'disputed') AS disputed,
                COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS total_revenue
            FROM bookings
        `);
        return result.rows[0];
    }
};

module.exports = Booking;

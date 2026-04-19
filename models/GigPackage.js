// ============================================================
// GigPackage Model — Pricing tiers for service gigs
// ============================================================

const pool = require('../config/db');

const GigPackage = {

    // ─── CREATE ─────────────────────────────────────────────

    async create({ gig_id, tier, title, description, price, delivery_time, features }) {
        const result = await pool.query(
            `INSERT INTO gig_packages (gig_id, tier, title, description, price, delivery_time, features)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [gig_id, tier, title, description, price, delivery_time, JSON.stringify(features || [])]
        );
        return result.rows[0];
    },

    // Create all three tiers at once (basic, standard, premium)
    async createAll(gigId, packages) {
        const results = [];
        for (const pkg of packages) {
            const result = await this.create({ ...pkg, gig_id: gigId });
            results.push(result);
        }
        return results;
    },

    // ─── READ ───────────────────────────────────────────────

    async findByGig(gigId) {
        const result = await pool.query(
            "SELECT * FROM gig_packages WHERE gig_id = $1 ORDER BY CASE tier WHEN 'basic' THEN 1 WHEN 'standard' THEN 2 WHEN 'premium' THEN 3 END",
            [gigId]
        );
        return result.rows;
    },

    async findById(id) {
        const result = await pool.query(
            `SELECT gp.*, sg.title AS gig_title, sg.worker_id
             FROM gig_packages gp
             JOIN service_gigs sg ON gp.gig_id = sg.id
             WHERE gp.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async update(id, data) {
        const result = await pool.query(
            `UPDATE gig_packages SET
                title = COALESCE($2, title),
                description = COALESCE($3, description),
                price = COALESCE($4, price),
                delivery_time = COALESCE($5, delivery_time),
                features = COALESCE($6, features)
             WHERE id = $1
             RETURNING *`,
            [id, data.title, data.description, data.price, data.delivery_time,
                data.features ? JSON.stringify(data.features) : null]
        );
        return result.rows[0];
    },

    // ─── DELETE ─────────────────────────────────────────────

    async delete(id) {
        await pool.query('DELETE FROM gig_packages WHERE id = $1', [id]);
    },

    async deleteByGig(gigId) {
        await pool.query('DELETE FROM gig_packages WHERE gig_id = $1', [gigId]);
    }
};

module.exports = GigPackage;

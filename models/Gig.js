// ============================================================
// Gig Model — Full CRUD for service_gigs table
// ============================================================

const pool = require('../config/db');

const Gig = {

    // ─── CREATE ─────────────────────────────────────────────

    async create(data) {
        const result = await pool.query(
            `INSERT INTO service_gigs
             (worker_id, category_id, title, description, tags,
              portfolio_images, portfolio_videos, delivery_time,
              starting_price, faq, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING *`,
            [
                data.worker_id, data.category_id, data.title, data.description,
                JSON.stringify(data.tags || []),
                JSON.stringify(data.portfolio_images || []),
                JSON.stringify(data.portfolio_videos || []),
                data.delivery_time, data.starting_price,
                JSON.stringify(data.faq || []),
                data.status || 'draft'
            ]
        );
        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────

    async findActive() {
        const result = await pool.query(
            `SELECT sg.*, c.name AS category_name,
                    p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                    p.avatar_url AS worker_avatar, p.avg_rating AS worker_rating,
                    p.total_completed AS worker_completed
             FROM service_gigs sg
             LEFT JOIN categories c ON sg.category_id = c.id
             LEFT JOIN profiles p ON sg.worker_id = p.user_id
             WHERE sg.status = 'active'
             ORDER BY sg.created_at DESC`
        );
        return result.rows;
    },

    async findById(id) {
        const result = await pool.query(
            `SELECT sg.*, c.name AS category_name,
                    p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                    p.avatar_url AS worker_avatar, p.avg_rating AS worker_rating,
                    p.total_completed AS worker_completed, p.bio AS worker_bio,
                    u.created_at AS worker_member_since
             FROM service_gigs sg
             LEFT JOIN categories c ON sg.category_id = c.id
             LEFT JOIN profiles p ON sg.worker_id = p.user_id
             LEFT JOIN users u ON sg.worker_id = u.id
             WHERE sg.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    async findByWorker(workerId) {
        const result = await pool.query(
            `SELECT sg.*, c.name AS category_name
             FROM service_gigs sg
             LEFT JOIN categories c ON sg.category_id = c.id
             WHERE sg.worker_id = $1
             ORDER BY sg.created_at DESC`,
            [workerId]
        );
        return result.rows;
    },

    // Search/filter gigs
    async search({ category_id, minPrice, maxPrice, keyword, sortBy }) {
        let query = `
            SELECT sg.*, c.name AS category_name,
                   p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                   p.avg_rating AS worker_rating
            FROM service_gigs sg
            LEFT JOIN categories c ON sg.category_id = c.id
            LEFT JOIN profiles p ON sg.worker_id = p.user_id
            WHERE sg.status = 'active'
        `;
        const params = [];
        let i = 1;

        if (category_id) { query += ` AND sg.category_id = $${i++}`; params.push(category_id); }
        if (minPrice) { query += ` AND sg.starting_price >= $${i++}`; params.push(minPrice); }
        if (maxPrice) { query += ` AND sg.starting_price <= $${i++}`; params.push(maxPrice); }
        //Search base query in this line of code
        if (keyword) { query += ` AND (sg.title ILIKE $${i} OR sg.description ILIKE $${i} OR p.first_name ILIKE $${i} OR p.last_name ILIKE $${i})`; params.push(`%${keyword}%`); i++; }

        switch (sortBy) {
            case 'price_low': query += ' ORDER BY sg.starting_price ASC'; break;
            case 'price_high': query += ' ORDER BY sg.starting_price DESC'; break;
            case 'rating': query += ' ORDER BY p.avg_rating DESC'; break;
            default: query += ' ORDER BY sg.created_at DESC';
        }

        const result = await pool.query(query, params);
        return result.rows;
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async update(id, data) {
        const result = await pool.query(
            `UPDATE service_gigs SET
                title = COALESCE($2, title),
                description = COALESCE($3, description),
                category_id = COALESCE($4, category_id),
                tags = COALESCE($5, tags),
                portfolio_images = COALESCE($6, portfolio_images),
                portfolio_videos = COALESCE($7, portfolio_videos),
                delivery_time = COALESCE($8, delivery_time),
                starting_price = COALESCE($9, starting_price),
                faq = COALESCE($10, faq)
             WHERE id = $1
             RETURNING *`,
            [
                id, data.title, data.description, data.category_id,
                data.tags ? JSON.stringify(data.tags) : null,
                data.portfolio_images ? JSON.stringify(data.portfolio_images) : null,
                data.portfolio_videos ? JSON.stringify(data.portfolio_videos) : null,
                data.delivery_time, data.starting_price,
                data.faq ? JSON.stringify(data.faq) : null
            ]
        );
        return result.rows[0];
    },

    async updateStatus(id, status) {
        await pool.query('UPDATE service_gigs SET status = $1 WHERE id = $2', [status, id]);
    },

    async incrementViews(id) {
        await pool.query('UPDATE service_gigs SET view_count = view_count + 1 WHERE id = $1', [id]);
    },

    async incrementImpressions(id) {
        await pool.query('UPDATE service_gigs SET impression_count = impression_count + 1 WHERE id = $1', [id]);
    },

    // ─── DELETE ─────────────────────────────────────────────

    async delete(id) {
        await pool.query('DELETE FROM service_gigs WHERE id = $1', [id]);
    },

    async softDelete(id) {
        await this.updateStatus(id, 'deleted');
    }
};

module.exports = Gig;

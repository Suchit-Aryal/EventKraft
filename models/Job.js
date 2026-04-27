// ============================================================
// Job Model — Full CRUD for job_postings table
// ============================================================

const pool = require('../config/db');

const Job = {

    // ─── CREATE ─────────────────────────────────────────────

    async create(data) {
        const result = await pool.query(
            `INSERT INTO job_postings
             (customer_id, category_id, title, description, event_type, event_date,
              event_location, budget_min, budget_max, proposal_deadline,
              attachments, special_requirements, status, max_proposals)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             RETURNING *`,
            [
                data.customer_id, data.category_id, data.title, data.description,
                data.event_type, data.event_date, data.event_location,
                data.budget_min, data.budget_max, data.proposal_deadline,
                JSON.stringify(data.attachments || []),
                data.special_requirements, data.status || 'draft',
                data.max_proposals || 20
            ]
        );
        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────

    async findPublished() {
        const result = await pool.query(
            `SELECT jp.*, c.name AS category_name,
                    p.first_name AS customer_first_name, p.last_name AS customer_last_name,
                    (SELECT COUNT(*) FROM proposals WHERE job_id = jp.id) AS proposal_count
             FROM job_postings jp
             LEFT JOIN categories c ON jp.category_id = c.id
             LEFT JOIN profiles p ON jp.customer_id = p.user_id
             WHERE jp.status = 'published'
             ORDER BY jp.created_at DESC`
        );
        return result.rows;
    },

    async findById(id) {
        const result = await pool.query(
            `SELECT jp.*, c.name AS category_name,
                    p.first_name AS customer_first_name, p.last_name AS customer_last_name,
                    p.avatar_url AS customer_avatar,
                    (SELECT COUNT(*) FROM proposals WHERE job_id = jp.id) AS proposal_count
             FROM job_postings jp
             LEFT JOIN categories c ON jp.category_id = c.id
             LEFT JOIN profiles p ON jp.customer_id = p.user_id
             WHERE jp.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    async findByCustomer(customerId) {
        const result = await pool.query(
            `SELECT jp.*, c.name AS category_name,
                    (SELECT COUNT(*) FROM proposals WHERE job_id = jp.id) AS proposal_count
             FROM job_postings jp
             LEFT JOIN categories c ON jp.category_id = c.id
             WHERE jp.customer_id = $1
             ORDER BY jp.created_at DESC`,
            [customerId]
        );
        return result.rows;
    },

    // Search/filter jobs
    async search({ category_id, minBudget, maxBudget, location, keyword }) {
        let query = `
            SELECT jp.*, c.name AS category_name,
                   (SELECT COUNT(*) FROM proposals WHERE job_id = jp.id) AS proposal_count
            FROM job_postings jp
            LEFT JOIN categories c ON jp.category_id = c.id
            WHERE jp.status = 'published'
        `;
        const params = [];
        let i = 1;

        if (category_id) { query += ` AND jp.category_id = $${i++}`; params.push(category_id); }
        if (minBudget) { query += ` AND jp.budget_max >= $${i++}`; params.push(minBudget); }
        if (maxBudget) { query += ` AND jp.budget_min <= $${i++}`; params.push(maxBudget); }
        if (location) { query += ` AND jp.event_location ILIKE $${i++}`; params.push(`%${location}%`); }
        //Search line query in this line of code which does the searching 
        if (keyword) { query += ` AND (jp.title ILIKE $${i} OR jp.description ILIKE $${i})`; params.push(`%${keyword}%`); i++; }

        query += ' ORDER BY jp.created_at DESC';
        const result = await pool.query(query, params);
        return result.rows;
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async update(id, data) {
        const result = await pool.query(
            `UPDATE job_postings SET
                title = COALESCE($2, title),
                description = COALESCE($3, description),
                event_type = COALESCE($4, event_type),
                event_date = COALESCE($5, event_date),
                event_location = COALESCE($6, event_location),
                budget_min = COALESCE($7, budget_min),
                budget_max = COALESCE($8, budget_max),
                special_requirements = COALESCE($9, special_requirements),
                category_id = COALESCE($10, category_id)
             WHERE id = $1
             RETURNING *`,
            [
                id, data.title, data.description, data.event_type,
                data.event_date, data.event_location,
                data.budget_min, data.budget_max,
                data.special_requirements, data.category_id
            ]
        );
        return result.rows[0];
    },

    async updateStatus(id, status) {
        const result = await pool.query(
            'UPDATE job_postings SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0];
    },

    async selectWorker(jobId, workerId) {
        await pool.query(
            "UPDATE job_postings SET selected_worker_id = $1, status = 'in_progress' WHERE id = $2",
            [workerId, jobId]
        );
    },

    // ─── DELETE ─────────────────────────────────────────────

    async delete(id) {
        await pool.query('DELETE FROM job_postings WHERE id = $1', [id]);
    },

    async cancel(id) {
        return this.updateStatus(id, 'cancelled');
    }
};

module.exports = Job;

// ============================================================
// Category Model — Service categories
// ============================================================

const pool = require('../config/db');

const Category = {

    // ─── READ ───────────────────────────────────────────────

    async findAll() {
        const result = await pool.query(
            'SELECT * FROM categories WHERE parent_id IS NULL AND is_active = true ORDER BY sort_order'
        );
        return result.rows;
    },

    async findById(id) {
        const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
        return result.rows[0];
    },

    async findBySlug(slug) {
        const result = await pool.query('SELECT * FROM categories WHERE slug = $1', [slug]);
        return result.rows[0];
    },

    // Get subcategories of a parent
    async findSubcategories(parentId) {
        const result = await pool.query(
            'SELECT * FROM categories WHERE parent_id = $1 AND is_active = true ORDER BY sort_order',
            [parentId]
        );
        return result.rows;
    },

    // Get categories with gig/job counts
    async findWithCounts() {
        const result = await pool.query(
            `SELECT c.*,
                (SELECT COUNT(*) FROM service_gigs WHERE category_id = c.id AND status = 'active') AS gig_count,
                (SELECT COUNT(*) FROM job_postings WHERE category_id = c.id AND status = 'published') AS job_count
             FROM categories c
             WHERE c.parent_id IS NULL AND c.is_active = true
             ORDER BY c.sort_order`
        );
        return result.rows;
    },

    // ─── CREATE ─────────────────────────────────────────────

    async create({ name, slug, description, icon, parent_id }) {
        const result = await pool.query(
            `INSERT INTO categories (name, slug, description, icon, parent_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, slug, description, icon, parent_id || null]
        );
        return result.rows[0];
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async update(id, data) {
        const result = await pool.query(
            `UPDATE categories SET
                name = COALESCE($2, name),
                slug = COALESCE($3, slug),
                description = COALESCE($4, description),
                icon = COALESCE($5, icon),
                is_active = COALESCE($6, is_active),
                sort_order = COALESCE($7, sort_order)
             WHERE id = $1
             RETURNING *`,
            [id, data.name, data.slug, data.description, data.icon, data.is_active, data.sort_order]
        );
        return result.rows[0];
    },

    // ─── DELETE ─────────────────────────────────────────────

    async deactivate(id) {
        await pool.query('UPDATE categories SET is_active = false WHERE id = $1', [id]);
    }
};

module.exports = Category;

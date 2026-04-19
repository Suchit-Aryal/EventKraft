// ============================================================
// User Model — Full CRUD for the users table
// ============================================================

const pool = require('../config/db');
const bcrypt = require('bcrypt');

const User = {

    // ─── CREATE ─────────────────────────────────────────────

    async create({ email, phone, password, role }) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO users (email, phone, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, phone, role, is_verified, is_active, created_at`,
            [email.toLowerCase(), phone || null, passwordHash, role]
        );
        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────

    async findByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        return result.rows[0];
    },

    async findById(id) {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1', [id]
        );
        return result.rows[0];
    },

    // Get user with their full profile (JOIN)
    async findWithProfile(id) {
        const result = await pool.query(
            `SELECT u.id, u.email, u.phone, u.role, u.is_verified, u.is_active, u.created_at,
                    p.first_name, p.last_name, p.avatar_url, p.bio, p.city,
                    p.avg_rating, p.total_reviews, p.total_completed, p.is_admin_verified
             FROM users u
             LEFT JOIN profiles p ON u.id = p.user_id
             WHERE u.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    async findAll() {
        const result = await pool.query(
            `SELECT u.id, u.email, u.phone, u.role, u.is_verified, u.is_active, u.created_at,
                    p.first_name, p.last_name
             FROM users u
             LEFT JOIN profiles p ON u.id = p.user_id
             ORDER BY u.created_at DESC`
        );
        return result.rows;
    },

    // Get users by role
    async findByRole(role) {
        const result = await pool.query(
            `SELECT u.id, u.email, u.role, u.is_active,
                    p.first_name, p.last_name, p.avg_rating, p.total_completed
             FROM users u
             LEFT JOIN profiles p ON u.id = p.user_id
             WHERE u.role = $1 AND u.is_active = true
             ORDER BY p.avg_rating DESC`,
            [role]
        );
        return result.rows;
    },

    // Search users by name or email
    async search(query) {
        const result = await pool.query(
            `SELECT u.id, u.email, u.role,
                    p.first_name, p.last_name, p.avatar_url, p.avg_rating
             FROM users u
             LEFT JOIN profiles p ON u.id = p.user_id
             WHERE u.is_active = true
               AND (u.email ILIKE $1 OR p.first_name ILIKE $1 OR p.last_name ILIKE $1)`,
            [`%${query}%`]
        );
        return result.rows;
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async updateEmail(id, email) {
        await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email.toLowerCase(), id]);
    },

    async updatePassword(id, newPassword) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
    },

    async setActive(id, isActive) {
        await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [isActive, id]);
    },

    async setVerified(id, isVerified) {
        await pool.query('UPDATE users SET is_verified = $1 WHERE id = $2', [isVerified, id]);
    },

    async updateRole(id, role) {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    },

    // ─── DELETE ─────────────────────────────────────────────

    async delete(id) {
        // ON DELETE CASCADE will remove profile, proposals, etc.
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
    },

    // Soft delete (deactivate)
    async softDelete(id) {
        await pool.query('UPDATE users SET is_active = false WHERE id = $1', [id]);
    },

    // ─── AUTH HELPERS ───────────────────────────────────────

    async verifyPassword(id, password) {
        const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);
        if (!result.rows[0]) return false;
        return bcrypt.compare(password, result.rows[0].password_hash);
    },

    // ─── ADMIN STATS ───────────────────────────────────────

    async getStats() {
        const result = await pool.query(`
            SELECT 
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE role = 'customer') AS customers,
                COUNT(*) FILTER (WHERE role = 'worker') AS workers,
                COUNT(*) FILTER (WHERE role = 'admin') AS admins,
                COUNT(*) FILTER (WHERE is_active = true) AS active,
                COUNT(*) FILTER (WHERE is_verified = true) AS verified
            FROM users
        `);
        return result.rows[0];
    }
};

module.exports = User;

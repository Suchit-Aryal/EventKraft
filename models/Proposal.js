// ============================================================
// Proposal Model — Worker proposals on job postings
// ============================================================

const pool = require('../config/db');

const Proposal = {

    // ─── CREATE ─────────────────────────────────────────────
    async create(data) {
        const result = await pool.query(
            `INSERT INTO proposals
             (job_id, worker_id, cover_letter, proposed_price,
              estimated_duration, portfolio_links, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                data.job_id, data.worker_id, data.cover_letter,
                data.proposed_price, data.estimated_duration,
                JSON.stringify(data.portfolio_links || []),
                data.status || 'pending'
            ]
        );
        return result.rows[0];
    },

    // ─── READ ───────────────────────────────────────────────

    async findById(id) {
        const result = await pool.query(
            `SELECT pr.*, 
                p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                p.avatar_url AS worker_avatar, p.avg_rating AS worker_rating,
                p.total_completed AS worker_completed
             FROM proposals pr
             JOIN profiles p ON pr.worker_id = p.user_id
             WHERE pr.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    // Get all proposals for a specific job (customer views these)
    async findByJob(jobId) {
        const result = await pool.query(
            `SELECT pr.*,
                p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                p.avatar_url AS worker_avatar, p.avg_rating AS worker_rating,
                p.total_completed AS worker_completed
             FROM proposals pr
             JOIN profiles p ON pr.worker_id = p.user_id
             WHERE pr.job_id = $1
             ORDER BY pr.created_at DESC`,
            [jobId]
        );
        return result.rows;
    },

    // Get all proposals by a worker (worker's "My Proposals")
    async findByWorker(workerId) {
        const result = await pool.query(
            `SELECT pr.*, jp.title AS job_title, jp.status AS job_status,
                jp.budget_min, jp.budget_max, jp.event_date
             FROM proposals pr
             JOIN job_postings jp ON pr.job_id = jp.id
             WHERE pr.worker_id = $1
             ORDER BY pr.created_at DESC`,
            [workerId]
        );
        return result.rows;
    },

    // Check if worker already applied to a job
    async hasApplied(jobId, workerId) {
        const result = await pool.query(
            'SELECT id FROM proposals WHERE job_id = $1 AND worker_id = $2',
            [jobId, workerId]
        );
        return result.rows.length > 0;
    },

    // Count proposals for a job
    async countByJob(jobId) {
        const result = await pool.query(
            'SELECT COUNT(*) FROM proposals WHERE job_id = $1',
            [jobId]
        );
        return parseInt(result.rows[0].count);
    },

    // ─── UPDATE ─────────────────────────────────────────────

    async updateStatus(id, status) {
        const result = await pool.query(
            'UPDATE proposals SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0];
    },

    // Accept proposal → also update the job's selected_worker_id
    async accept(proposalId) {
        const proposal = await pool.query(
            'UPDATE proposals SET status = $1 WHERE id = $2 RETURNING *',
            ['accepted', proposalId]
        );
        const p = proposal.rows[0];

        // Set selected worker on the job
        await pool.query(
            "UPDATE job_postings SET selected_worker_id = $1, status = 'in_progress' WHERE id = $2",
            [p.worker_id, p.job_id]
        );

        // Decline all other pending proposals for this job
        await pool.query(
            "UPDATE proposals SET status = 'declined' WHERE job_id = $1 AND id != $2 AND status = 'pending'",
            [p.job_id, proposalId]
        );

        return p;
    },

    async shortlist(id) {
        return this.updateStatus(id, 'shortlisted');
    },

    async decline(id) {
        return this.updateStatus(id, 'declined');
    },

    async withdraw(id) {
        return this.updateStatus(id, 'withdrawn');
    },

    // ─── DELETE ─────────────────────────────────────────────
    async delete(id) {
        await pool.query('DELETE FROM proposals WHERE id = $1', [id]);
    }
};

module.exports = Proposal;

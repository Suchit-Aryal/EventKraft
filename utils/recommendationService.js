// ============================================================
// Recommendation Service — pgvector semantic similarity.
// A user's "taste vector" is the average embedding of what
// they interacted with (customers: booked gigs; workers:
// their own gigs). Candidates are ranked by cosine distance
// (<=> operator). Falls back to category-affinity SQL when
// embeddings or history are missing.
// ============================================================

const pool = require('../config/db');

const recommendationService = {

    // Active gigs for a customer, semantically closest to what they booked before.
    // Excludes gigs the customer already booked.
    async forCustomer(userId, limit = 8) {
        const result = await pool.query(
            `WITH taste AS (
                 SELECT AVG(sg2.embedding) AS vec
                 FROM bookings bk
                 JOIN service_gigs sg2 ON sg2.id = bk.gig_id
                 WHERE bk.customer_id = $1 AND sg2.embedding IS NOT NULL
             )
             SELECT sg.id, sg.title, sg.starting_price, sg.portfolio_images,
                    c.name AS category_name,
                    p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                    p.avg_rating AS worker_rating,
                    (sg.embedding <=> taste.vec) AS distance
             FROM service_gigs sg
             CROSS JOIN taste
             LEFT JOIN categories c ON sg.category_id = c.id
             LEFT JOIN profiles p ON sg.worker_id = p.user_id
             WHERE sg.status = 'active'
               AND sg.embedding IS NOT NULL
               AND taste.vec IS NOT NULL
               AND sg.id NOT IN (
                   SELECT gig_id FROM bookings
                   WHERE customer_id = $1 AND gig_id IS NOT NULL
               )
             ORDER BY sg.embedding <=> taste.vec
             LIMIT $2`,
            [userId, limit]
        );
        if (result.rows.length > 0) return result.rows;
        return this.forCustomerFallback(userId, limit);
    },

    // Published jobs for a worker, semantically closest to the services they offer.
    // Excludes jobs they already sent a proposal to, and their own postings.
    async forWorker(userId, limit = 8) {
        const result = await pool.query(
            `WITH taste AS (
                 SELECT AVG(embedding) AS vec
                 FROM service_gigs
                 WHERE worker_id = $1 AND embedding IS NOT NULL
             )
             SELECT jp.id, jp.title, jp.event_type, jp.event_date, jp.event_location,
                    jp.budget_min, jp.budget_max, jp.created_at,
                    c.name AS category_name,
                    (jp.embedding <=> taste.vec) AS distance
             FROM job_postings jp
             CROSS JOIN taste
             LEFT JOIN categories c ON jp.category_id = c.id
             WHERE jp.status = 'published'
               AND jp.embedding IS NOT NULL
               AND taste.vec IS NOT NULL
               AND jp.customer_id <> $1
               AND NOT EXISTS (
                   SELECT 1 FROM proposals pr
                   WHERE pr.job_id = jp.id AND pr.worker_id = $1
                     AND pr.status NOT IN ('declined', 'withdrawn')
               )
             ORDER BY jp.embedding <=> taste.vec
             LIMIT $2`,
            [userId, limit]
        );
        if (result.rows.length > 0) return result.rows;
        return this.forWorkerFallback(userId, limit);
    },

    // ─── Fallbacks (original category-affinity SQL) ─────────

    async forCustomerFallback(userId, limit = 8) {
        const result = await pool.query(
            `SELECT sg.id, sg.title, sg.starting_price, sg.portfolio_images,
                    c.name AS category_name,
                    p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                    p.avg_rating AS worker_rating,
                    (sg.category_id IN (
                        SELECT DISTINCT sg2.category_id
                        FROM bookings bk
                        JOIN service_gigs sg2 ON sg2.id = bk.gig_id
                        WHERE bk.customer_id = $1
                    )) AS from_booked_category
             FROM service_gigs sg
             LEFT JOIN categories c ON sg.category_id = c.id
             LEFT JOIN profiles p ON sg.worker_id = p.user_id
             WHERE sg.status = 'active'
               AND sg.id NOT IN (
                   SELECT gig_id FROM bookings
                   WHERE customer_id = $1 AND gig_id IS NOT NULL
               )
             ORDER BY from_booked_category DESC NULLS LAST,
                      p.avg_rating DESC NULLS LAST,
                      sg.view_count DESC
             LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    },

    async forWorkerFallback(userId, limit = 8) {
        const result = await pool.query(
            `SELECT jp.id, jp.title, jp.event_type, jp.event_date, jp.event_location,
                    jp.budget_min, jp.budget_max, jp.created_at,
                    c.name AS category_name,
                    (jp.category_id IN (
                        SELECT DISTINCT category_id FROM service_gigs
                        WHERE worker_id = $1 AND category_id IS NOT NULL
                    )) AS from_own_category
             FROM job_postings jp
             LEFT JOIN categories c ON jp.category_id = c.id
             WHERE jp.status = 'published'
               AND jp.customer_id <> $1
               AND NOT EXISTS (
                   SELECT 1 FROM proposals pr
                   WHERE pr.job_id = jp.id AND pr.worker_id = $1
               )
             ORDER BY from_own_category DESC NULLS LAST,
                      jp.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    },
};

module.exports = recommendationService;

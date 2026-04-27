// ============================================================
// Job Controller — with search/filter support
// ============================================================

const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const pool = require('../config/db');

module.exports = {

    // GET /jobs
    async index(req, res) {
        try {
            const { keyword, category_id, minBudget, maxBudget, location } = req.query;
            const hasFilters = keyword || category_id || minBudget || maxBudget || location;

            let jobs;
            if (hasFilters) {
                jobs = await Job.search({ category_id, minBudget, maxBudget, location, keyword });
            } else {
                jobs = await Job.findPublished();
            }

            // Fetch categories for filter dropdown
            const categories = await pool.query(
                'SELECT id, name FROM categories WHERE is_active = true ORDER BY sort_order'
            );

            res.render('pages/jobs', {
                title: 'Browse Jobs',
                jobs,
                categories: categories.rows,
                filters: { keyword: keyword || '', category_id: category_id || '', minBudget: minBudget || '', maxBudget: maxBudget || '', location: location || '' }
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load jobs');
            res.redirect('/app/jobs');
        }
    },

    // GET /jobs/api/search — JSON autocomplete
    async apiSearch(req, res) {
        try {
            const { q } = req.query;
            if (!q || q.trim().length < 2) return res.json([]);

            const result = await pool.query(
                `SELECT jp.id, jp.title, jp.budget_min, jp.budget_max, jp.event_location, c.name AS category_name
                 FROM job_postings jp
                 LEFT JOIN categories c ON jp.category_id = c.id
                 WHERE jp.status = 'published'
                   AND (jp.title ILIKE $1 OR jp.description ILIKE $1 OR c.name ILIKE $1 OR jp.event_location ILIKE $1)
                 ORDER BY jp.created_at DESC
                 LIMIT 8`,
                [`%${q.trim()}%`]
            );
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.json([]);
        }
    },

    // GET /jobs/create
    async create(req, res) {
        const categories = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order');
        res.render('pages/job-create', { title: 'Post a Job', categories: categories.rows });
    },

    // POST /jobs
    async store(req, res) {
        try {
            const job = await Job.create({ ...req.body, customer_id: req.user.id });
            req.flash('success', 'Job posted successfully!');
            res.redirect(`/jobs/${job.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to create job');
            res.redirect('/jobs/create');
        }
    },

    // GET /jobs/:id
    async show(req, res) {
        try {
            const job = await Job.findById(req.params.id);
            if (!job) return res.status(404).render('pages/404', { title: 'Job Not Found' });

            // Get proposals for this job
            let proposals = [];
            if (req.user && (req.user.id === job.customer_id || req.user.role === 'admin')) {
                proposals = await Proposal.findByJob(req.params.id);
            }

            res.render('pages/job-detail', { title: job.title, job, proposals });
        } catch (err) {
            console.error(err);
            res.redirect('/jobs');
        }
    },

    // POST /jobs/:id/proposals — Worker submits a proposal
    async submitProposal(req, res) {
        try {
            const already = await Proposal.hasApplied(req.params.id, req.user.id);
            if (already) {
                req.flash('error', 'You already submitted a proposal for this job');
                return res.redirect(`/jobs/${req.params.id}`);
            }

            await Proposal.create({
                job_id: req.params.id,
                worker_id: req.user.id,
                cover_letter: req.body.cover_letter,
                proposed_price: req.body.proposed_price,
                estimated_duration: req.body.estimated_duration || null,
                portfolio_links: req.body.portfolio_links || []
            });

            req.flash('success', 'Proposal submitted! The customer will be notified.');
            res.redirect(`/jobs/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to submit proposal');
            res.redirect(`/jobs/${req.params.id}`);
        }
    },

    // PUT /jobs/:id
    async update(req, res) {
        try {
            await Job.update(req.params.id, req.body);
            req.flash('success', 'Job updated');
            res.redirect(`/jobs/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to update job');
            res.redirect(`/jobs/${req.params.id}`);
        }
    },

    // DELETE /jobs/:id
    async destroy(req, res) {
        try {
            await Job.updateStatus(req.params.id, 'cancelled');
            req.flash('success', 'Job cancelled');
            res.redirect('/auth/dashboard');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to cancel job');
            res.redirect(`/jobs/${req.params.id}`);
        }
    }
};

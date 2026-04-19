// ============================================================
// Job Controller
// ============================================================

const Job = require('../models/Job');
const pool = require('../config/db');

module.exports = {

    // GET /jobs
    async index(req, res) {
        try {
            const jobs = await Job.findPublished();
            res.render('pages/jobs', { title: 'Browse Jobs', jobs });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load jobs');
            res.redirect('/');
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
            res.render('pages/job-detail', { title: job.title, job });
        } catch (err) {
            console.error(err);
            res.redirect('/jobs');
        }
    },

    // PUT /jobs/:id
    async update(req, res) {
        try {
            // TODO: implement full update
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

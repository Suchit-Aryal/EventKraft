// ============================================================
// Job Controller — with search/filter support
// ============================================================

const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const pool = require('../config/db');
const NEPAL_CITIES = require('../lib/nepal-cities');

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
                layout: req.user ? 'dashboard' : 'public',
                activePage: 'browse-jobs',
                jobs,
                categories: categories.rows,
                filters: { keyword: keyword || '', category_id: category_id || '', minBudget: minBudget || '', maxBudget: maxBudget || '', location: location || '' }
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load jobs');
            res.redirect('/jobs');
        }
    },

    // GET /jobs/mine — Customer sees their job postings
    async myJobs(req, res) {
        try {
            const jobs = await Job.findByCustomer(req.user.id);
            res.render('pages/my-jobs', {
                title: 'My Jobs',
                layout: 'dashboard',
                activePage: 'my-jobs',
                jobs
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load your jobs');
            res.redirect('/dashboard');
        }
    },

    async myProposals(req, res) {
        try {
            const proposals = await Proposal.findByWorker(req.user.id);
            res.render('pages/my-proposals', {
                title: 'My Proposals',
                layout: 'dashboard',
                activePage: 'proposals',
                proposals
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load your proposals');
            res.redirect('/dashboard');
        }
    },

    // GET /jobs/api/search — JSON autocomplete
    // GET /jobs/:id/edit — Edit existing job
    async edit(req, res) {
        try {
            const job = await Job.findById(req.params.id);
            if (!job) return res.status(404).render('pages/404', { title: 'Job Not Found' });
            if (job.customer_id !== req.user.id) {
                req.flash('error', 'You can only edit your own jobs.');
                return res.redirect('/dashboard');
            }
            const categories = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order');
            res.render('pages/job-create', {
                title: 'Edit Job',
                layout: 'dashboard',
                activePage: 'create-job',
                categories: categories.rows,
                nepalCities: NEPAL_CITIES,
                job  // pass job data for pre-filling
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load job');
            res.redirect('/dashboard');
        }
    },

    async apiSearch(req, res) {
        try {
            const { q } = req.query;
            if (!q || q.trim().length < 2) return res.json([]);

            const result = await pool.query(
                `SELECT jp.id, jp.title, jp.budget_min, jp.budget_max, jp.event_location, c.name AS category_name,
                        TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS customer_name
                 FROM job_postings jp
                 LEFT JOIN categories c ON jp.category_id = c.id
                 LEFT JOIN profiles p ON jp.customer_id = p.user_id
                 WHERE jp.status = 'published'
                   AND (jp.title ILIKE $1 OR jp.description ILIKE $1 OR c.name ILIKE $1 OR jp.event_location ILIKE $1 OR p.first_name ILIKE $1 OR p.last_name ILIKE $1)
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
        res.render('pages/job-create', { title: 'Post a Job', layout: 'dashboard', activePage: 'create-job', categories: categories.rows, nepalCities: NEPAL_CITIES });
    },

    // POST /jobs
    async store(req, res) {
        try {
            // Limit: max 3 active jobs per customer
            if (req.body.status !== 'draft') {
                const activeCount = await Job.countActiveByCustomer(req.user.id);
                if (activeCount >= 3) {
                    req.flash('error', 'You can only have 3 active job postings. Please cancel an existing one before posting a new job.');
                    return res.redirect('/jobs/create');
                }
            }

            // Date validation
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (req.body.event_date) {
                const eventDate = new Date(req.body.event_date);
                if (eventDate < today) {
                    req.flash('error', 'Event date cannot be in the past.');
                    return res.redirect('/jobs/create');
                }
            }
            if (req.body.proposal_deadline) {
                const deadline = new Date(req.body.proposal_deadline);
                if (deadline < today) {
                    req.flash('error', 'Proposal deadline cannot be in the past.');
                    return res.redirect('/jobs/create');
                }
            }

            const job = await Job.create({ ...req.body, customer_id: req.user.id });
            if (req.body.status === 'draft') {
                req.flash('success', 'Job saved as draft. You can publish it from your dashboard.');
                return res.redirect('/dashboard');
            }
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

            // Check if current worker already submitted a proposal
            let alreadyApplied = false;
            if (req.user && req.user.role === 'worker') {
                alreadyApplied = await Proposal.hasActiveProposal(req.params.id, req.user.id);
            }

            // Get proposals for this job
            let proposals = [];
            if (req.user && (req.user.id === job.customer_id || req.user.role === 'admin')) {
                proposals = await Proposal.findByJob(req.params.id);
            }

            res.render('pages/job-detail', {
                title: job.title,
                layout: req.user ? 'dashboard' : 'public',
                activePage: 'jobs',
                job,
                proposals,
                alreadyApplied,
            });
        } catch (err) {
            console.error(err);
            res.redirect('/jobs');
        }
    },

    // POST /jobs/:id/proposals — Worker submits a proposal
    async submitProposal(req, res) {
        try {
            const already = await Proposal.hasActiveProposal(req.params.id, req.user.id);
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
            res.redirect('/jobs');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to cancel job');
            res.redirect(`/jobs/${req.params.id}`);
        }
    },

    // POST /jobs/:id/publish
    async publish(req, res) {
        try {
            const job = await Job.findById(req.params.id);
            if (!job) { req.flash('error', 'Job not found'); return res.redirect('/dashboard'); }

            // Limit: max 3 active jobs
            const activeCount = await Job.countActiveByCustomer(req.user.id);
            if (job.status !== 'published' && activeCount >= 3) {
                req.flash('error', 'You can only have 3 active job postings. Cancel an existing one first.');
                return res.redirect('/dashboard');
            }

            // Date validation before publishing
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (job.event_date) {
                const eventDate = new Date(job.event_date);
                if (eventDate < today) {
                    req.flash('error', 'Cannot publish: event date is in the past. Please update the event date first.');
                    return res.redirect(`/jobs/${req.params.id}`);
                }
            }

            await Job.updateStatus(req.params.id, 'published');
            req.flash('success', 'Job published successfully!');
            res.redirect(`/jobs/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to publish job');
            res.redirect('/dashboard');
        }
    },
};

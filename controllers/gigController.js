// ============================================================
// Gig Controller
// ============================================================

const Gig = require('../models/Gig');
const pool = require('../config/db');

module.exports = {

    async index(req, res) {
        try {
            const gigs = await Gig.findActive();
            res.render('pages/gigs', { title: 'Browse Services', gigs });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load services');
            res.redirect('/');
        }
    },

    async create(req, res) {
        const categories = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order');
        res.render('pages/gig-create', { title: 'Create a Service', categories: categories.rows });
    },

    async store(req, res) {
        try {
            const gig = await Gig.create({ ...req.body, worker_id: req.user.id });
            req.flash('success', 'Service created!');
            res.redirect(`/gigs/${gig.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to create service');
            res.redirect('/gigs/create');
        }
    },

    async show(req, res) {
        try {
            const gig = await Gig.findById(req.params.id);
            if (!gig) return res.status(404).render('pages/404', { title: 'Service Not Found' });
            await Gig.incrementViews(req.params.id);
            res.render('pages/gig-detail', { title: gig.title, gig });
        } catch (err) {
            console.error(err);
            res.redirect('/gigs');
        }
    },

    async update(req, res) {
        try {
            req.flash('success', 'Service updated');
            res.redirect(`/gigs/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to update service');
            res.redirect(`/gigs/${req.params.id}`);
        }
    },

    async destroy(req, res) {
        try {
            await pool.query("UPDATE service_gigs SET status = 'deleted' WHERE id = $1", [req.params.id]);
            req.flash('success', 'Service deleted');
            res.redirect('/auth/dashboard');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to delete service');
            res.redirect(`/gigs/${req.params.id}`);
        }
    }
};

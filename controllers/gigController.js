// ============================================================
// Gig Controller — with search/filter support
// ============================================================

const Gig = require('../models/Gig');
const GigPackage = require('../models/GigPackage');
const pool = require('../config/db');

module.exports = {

    async index(req, res) {
        try {
            const { keyword, category_id, minPrice, maxPrice, sortBy } = req.query;
            const hasFilters = keyword || category_id || minPrice || maxPrice || sortBy;

            let gigs;
            if (hasFilters) {
                gigs = await Gig.search({ category_id, minPrice, maxPrice, keyword, sortBy });
            } else {
                gigs = await Gig.findActive();
            }

            // Fetch categories for the filter dropdown
            const categories = await pool.query(
                'SELECT id, name FROM categories WHERE is_active = true ORDER BY sort_order'
            );

            res.render('pages/gigs', {
                title: 'Browse Services',
                gigs,
                categories: categories.rows,
                filters: { keyword: keyword || '', category_id: category_id || '', minPrice: minPrice || '', maxPrice: maxPrice || '', sortBy: sortBy || '' }
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load services');
            res.redirect('/');
        }
    },

    // GET /gigs/api/search — JSON autocomplete
    async apiSearch(req, res) {
        try {
            const { q } = req.query;
            if (!q || q.trim().length < 2) return res.json([]);

            const result = await pool.query(
                `SELECT sg.id, sg.title, sg.starting_price, c.name AS category_name,
                        TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS worker_name
                 FROM service_gigs sg
                 LEFT JOIN categories c ON sg.category_id = c.id
                 LEFT JOIN profiles p ON sg.worker_id = p.user_id
                 WHERE sg.status = 'active'
                   AND (sg.title ILIKE $1 OR sg.description ILIKE $1 OR c.name ILIKE $1 OR p.first_name ILIKE $1 OR p.last_name ILIKE $1)
                 ORDER BY sg.created_at DESC
                 LIMIT 8`,
                [`%${q.trim()}%`]
            );
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.json([]);
        }
    },

    async create(req, res) {
        const categories = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order');
        res.render('pages/gig-create', { title: 'Create a Service', categories: categories.rows });
    },

    async store(req, res) {
        try {
            // Create the gig
            const gig = await Gig.create({ ...req.body, worker_id: req.user.id });

            // Handle tier/package creation if tiers were provided
            const { pkg_tier, pkg_title, pkg_description, pkg_price, pkg_delivery_time, pkg_features } = req.body;
            if (pkg_tier && pkg_title) {
                // Form fields come as arrays when multiple tiers are submitted
                const tiers = Array.isArray(pkg_tier) ? pkg_tier : [pkg_tier];
                const titles = Array.isArray(pkg_title) ? pkg_title : [pkg_title];
                const descriptions = Array.isArray(pkg_description) ? pkg_description : [pkg_description || ''];
                const prices = Array.isArray(pkg_price) ? pkg_price : [pkg_price];
                const deliveryTimes = Array.isArray(pkg_delivery_time) ? pkg_delivery_time : [pkg_delivery_time || ''];
                const featuresList = Array.isArray(pkg_features) ? pkg_features : [pkg_features || ''];

                const packages = [];
                for (let i = 0; i < tiers.length; i++) {
                    // Skip tiers without a title or price
                    if (!titles[i] || !prices[i]) continue;
                    packages.push({
                        tier: tiers[i],
                        title: titles[i],
                        description: descriptions[i] || '',
                        price: parseFloat(prices[i]),
                        delivery_time: deliveryTimes[i] || '',
                        features: (featuresList[i] || '').split(',').map(f => f.trim()).filter(Boolean)
                    });
                }

                if (packages.length > 0) {
                    await GigPackage.createAll(gig.id, packages);
                }
            }

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

            // Get packages for this gig
            const pkgResult = await pool.query(
                'SELECT * FROM gig_packages WHERE gig_id = $1 ORDER BY price ASC',
                [req.params.id]
            );

            // Get reviews for the worker
            const reviewResult = await pool.query(
                `SELECT r.*, p.first_name AS reviewer_first_name, p.last_name AS reviewer_last_name
                 FROM reviews r
                 JOIN profiles p ON r.reviewer_id = p.user_id
                 WHERE r.reviewee_id = $1 AND r.is_public = true
                 ORDER BY r.created_at DESC LIMIT 10`,
                [gig.worker_id]
            );

            res.render('pages/gig-detail', {
                title: gig.title,
                gig,
                packages: pkgResult.rows,
                reviews: reviewResult.rows
            });
        } catch (err) {
            console.error(err);
            res.redirect('/gigs');
        }
    },

    async update(req, res) {
        try {
            await Gig.update(req.params.id, req.body);
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

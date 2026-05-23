// ============================================================
// Gig Controller — with search/filter support
// ============================================================

const Gig = require('../models/Gig');
const GigPackage = require('../models/GigPackage');
const pool = require('../config/db');
const cloudinary = require('../config/cloudinary');
const NEPAL_CITIES = require('../lib/nepal-cities');

// Upload a buffer to Cloudinary and return the secure URL
function uploadToCloudinary(fileBuffer, mimetype) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'eventkraft/gigs', resource_type: 'image' },
            (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
            }
        );
        stream.end(fileBuffer);
    });
}

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
                layout: req.user ? 'dashboard' : 'public',
                activePage: 'browse-services',
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

    async myServices(req, res) {
        try {
            const gigs = await Gig.findByWorker(req.user.id);
            res.render('pages/my-services', {
                title: 'My Services',
                layout: 'dashboard',
                activePage: 'my-services',
                gigs
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load your services');
            res.redirect('/dashboard');
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
        res.render('pages/gig-create', { title: 'Create a Service', layout: 'dashboard', activePage: 'create-gig', categories: categories.rows, nepalCities: NEPAL_CITIES });
    },

    async store(req, res) {
        try {
            // Limit: max 3 active gigs per worker
            if (req.body.status !== 'draft') {
                const activeCount = await Gig.countActiveByWorker(req.user.id);
                if (activeCount >= 3) {
                    req.flash('error', 'You can only have 3 active services. Please deactivate an existing one before posting a new service.');
                    return res.redirect('/gigs/create');
                }
            }

            // Upload images to Cloudinary
            let imageUrls = [];
            if (req.files && req.files.length > 0) {
                const uploads = req.files.map(f => uploadToCloudinary(f.buffer, f.mimetype));
                imageUrls = await Promise.all(uploads);
            }

            // Create the gig with images
            const gig = await Gig.create({
                ...req.body,
                worker_id: req.user.id,
                portfolio_images: imageUrls
            });

            // Handle tier/package creation if tiers were provided
            const { pkg_tier, pkg_title, pkg_description, pkg_price, pkg_delivery_time, pkg_features } = req.body;
            if (pkg_tier && pkg_title) {
                const tiers = Array.isArray(pkg_tier) ? pkg_tier : [pkg_tier];
                const titles = Array.isArray(pkg_title) ? pkg_title : [pkg_title];
                const descriptions = Array.isArray(pkg_description) ? pkg_description : [pkg_description || ''];
                const prices = Array.isArray(pkg_price) ? pkg_price : [pkg_price];
                const deliveryTimes = Array.isArray(pkg_delivery_time) ? pkg_delivery_time : [pkg_delivery_time || ''];
                const featuresList = Array.isArray(pkg_features) ? pkg_features : [pkg_features || ''];

                const packages = [];
                for (let i = 0; i < tiers.length; i++) {
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
            if (gig.status === 'draft') {
                req.flash('success', 'Service saved as draft. You can edit or publish it from your services page.');
                return res.redirect('/gigs/mine');
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

            // Check if current user already booked this gig
            let alreadyBooked = false;
            if (req.user) {
                const Booking = require('../models/Booking');
                alreadyBooked = await Booking.hasActiveBooking(req.params.id, req.user.id);
            }

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
                layout: req.user ? 'dashboard' : 'public',
                activePage: 'gigs',
                gig,
                packages: pkgResult.rows,
                reviews: reviewResult.rows,
                alreadyBooked,
            });
        } catch (err) {
            console.error(err);
            res.redirect('/gigs');
        }
    },

    async update(req, res) {
        try {
            // If new images uploaded, upload to Cloudinary
            if (req.files && req.files.length > 0) {
                const uploads = req.files.map(f => uploadToCloudinary(f.buffer, f.mimetype));
                req.body.portfolio_images = await Promise.all(uploads);
            }

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
            await Gig.softDelete(req.params.id);
            req.flash('success', 'Service deleted');
            res.redirect('/gigs/mine');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to delete service');
            res.redirect(`/gigs/${req.params.id}`);
        }
    },

    async publish(req, res) {
        try {
            const gig = await Gig.findById(req.params.id);
            if (!gig) { req.flash('error', 'Service not found'); return res.redirect('/gigs/mine'); }

            if (gig.status !== 'active') {
                const activeCount = await Gig.countActiveByWorker(req.user.id);
                if (activeCount >= 3) {
                    req.flash('error', 'You can only have 3 active services. Deactivate an existing one first.');
                    return res.redirect('/gigs/mine');
                }
            }

            await Gig.updateStatus(req.params.id, 'active');
            req.flash('success', 'Service published!');
            res.redirect('/gigs/mine');
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to publish service');
            res.redirect('/gigs/mine');
        }
    },
};

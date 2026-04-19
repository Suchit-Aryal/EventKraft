// ============================================================
// Seed Script — Populate database with sample/demo data
// Run: node database/seed.js
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function seed() {
    console.log('🌱 Seeding EventKraft database with sample data...\n');

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);

        // ── Sample Customers ────────────────────────────────
        console.log('👤 Creating sample customers...');

        const customer1 = await createUser('aarav.sharma@gmail.com', hash, 'customer', 'Aarav', 'Sharma', 'Kathmandu');
        const customer2 = await createUser('sita.thapa@gmail.com', hash, 'customer', 'Sita', 'Thapa', 'Pokhara');
        const customer3 = await createUser('rajan.kc@gmail.com', hash, 'customer', 'Rajan', 'KC', 'Bhaktapur');

        console.log('   ✅ 3 customers created\n');

        // ── Sample Workers ──────────────────────────────────
        console.log('📸 Creating sample workers...');

        const worker1 = await createUser('ram.photography@gmail.com', hash, 'worker', 'Ram', 'Maharjan', 'Kathmandu');
        const worker2 = await createUser('priya.decor@gmail.com', hash, 'worker', 'Priya', 'Shrestha', 'Lalitpur');
        const worker3 = await createUser('bikash.video@gmail.com', hash, 'worker', 'Bikash', 'Tamang', 'Kathmandu');
        const worker4 = await createUser('anita.mehendi@gmail.com', hash, 'worker', 'Anita', 'Gurung', 'Pokhara');

        console.log('   ✅ 4 workers created\n');

        // ── Get Category IDs ────────────────────────────────
        const cats = await pool.query('SELECT id, slug FROM categories');
        const catMap = {};
        cats.rows.forEach(c => catMap[c.slug] = c.id);

        // ── Sample Gigs (Fiverr model) ──────────────────────
        console.log('🎨 Creating sample service gigs...');

        const gig1 = await createGig(worker1, catMap['photography'],
            'Premium Wedding Photography',
            'Professional wedding photography with 10+ years of experience. Covering Kathmandu Valley weddings with cinematic shots, candid moments, and premium editing.',
            25000, 'active');

        const gig2 = await createGig(worker2, catMap['decoration'],
            'Luxury Wedding Decoration & Mandap Setup',
            'Transform your venue into a dream wedding destination. Full decoration service including mandap, stage, floral arrangements, and lighting.',
            50000, 'active');

        const gig3 = await createGig(worker3, catMap['videography'],
            'Cinematic Wedding Videography',
            'Cinematic 4K wedding videography with drone shots, highlight reels, and full ceremony coverage. Same-day edit available.',
            35000, 'active');

        const gig4 = await createGig(worker4, catMap['mehendi'],
            'Traditional & Modern Mehendi Art',
            'Beautiful mehendi designs for brides and bridal parties. Traditional Nepali patterns combined with modern Arabic styles.',
            5000, 'active');

        console.log('   ✅ 4 service gigs created\n');

        // ── Sample Gig Packages ─────────────────────────────
        console.log('📦 Creating gig packages...');

        await createPackages(gig1, [
            { tier: 'basic', title: 'Essential', price: 25000, delivery_time: '7 days', features: ['200 edited photos', '4 hours coverage'] },
            { tier: 'standard', title: 'Premium', price: 50000, delivery_time: '10 days', features: ['500 edited photos', '8 hours coverage', 'Pre-wedding shoot'] },
            { tier: 'premium', title: 'Platinum', price: 100000, delivery_time: '14 days', features: ['Unlimited photos', 'Full day coverage', 'Pre-wedding shoot', 'Album included'] }
        ]);

        await createPackages(gig2, [
            { tier: 'basic', title: 'Stage Only', price: 50000, delivery_time: '2 days', features: ['Stage decoration', 'Basic lighting'] },
            { tier: 'standard', title: 'Full Venue', price: 120000, delivery_time: '3 days', features: ['Full venue decoration', 'Mandap setup', 'Flower arrangements'] },
            { tier: 'premium', title: 'Grand Wedding', price: 250000, delivery_time: '5 days', features: ['Full venue', 'Custom mandap', 'LED walls', 'Entrance decor', 'Car decoration'] }
        ]);

        console.log('   ✅ Gig packages created\n');

        // ── Sample Job Postings (Upwork model) ──────────────
        console.log('📋 Creating sample job postings...');

        const job1 = await createJob(customer1, catMap['photography'],
            'Looking for Wedding Photographer — Kathmandu',
            'We are getting married on June 15, 2026 at Hotel Yak & Yeti, Kathmandu. Looking for an experienced photographer who can capture both traditional and candid moments. Budget is negotiable for the right portfolio.',
            'Wedding', '2026-06-15', 'Kathmandu', 30000, 80000, 'published');

        const job2 = await createJob(customer2, catMap['decoration'],
            'Full Wedding Decoration Needed — Pokhara',
            'Looking for a decorator for a lakeside wedding venue in Pokhara. Need full mandap, stage, entrance, and table decorations. Theme: Royal Blue & Gold.',
            'Wedding', '2026-07-20', 'Pokhara', 100000, 200000, 'published');

        const job3 = await createJob(customer3, catMap['music-dj'],
            'DJ for Reception Party — Bhaktapur',
            'Need a DJ for wedding reception, 4-5 hours, mix of Nepali and Hindi songs. Must bring own equipment. Venue has power supply.',
            'Reception', '2026-08-10', 'Bhaktapur', 15000, 30000, 'published');

        console.log('   ✅ 3 job postings created\n');

        // ── Sample Proposals ────────────────────────────────
        console.log('📝 Creating sample proposals...');

        await createProposal(job1, worker1,
            'I would love to cover your wedding! I have 10+ years of experience with weddings at Hotel Yak & Yeti specifically. Please check my portfolio.',
            45000, '1 week delivery');

        await createProposal(job1, worker3,
            'Hi! I do both photography and videography packages. Can offer a combined deal. My drone shots are highly rated.',
            65000, '2 weeks delivery');

        await createProposal(job2, worker2,
            'I specialize in luxury wedding decorations. Royal Blue & Gold is one of my signature themes. Please see my previous work at Pokhara Grande.',
            150000, '3 days setup');

        console.log('   ✅ 3 proposals created\n');

        // ── Sample Booking ──────────────────────────────────
        console.log('📅 Creating sample booking...');

        await pool.query(
            `INSERT INTO bookings 
             (customer_id, worker_id, gig_id, total_amount, commission_rate, commission_amount, worker_earning, event_date, event_location, requirements, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'accepted')`,
            [customer1, worker1, gig1, 50000, 7.00, 3500, 46500, '2026-06-15', 'Kathmandu', 'Premium package — full day coverage']
        );

        console.log('   ✅ 1 sample booking created\n');


        console.log('═══════════════════════════════════════════');
        console.log('🌱 Seeding complete!');
        console.log('═══════════════════════════════════════════');
        console.log('');
        console.log('Sample logins (all password: password123):');
        console.log('  Customers: aarav.sharma@gmail.com, sita.thapa@gmail.com, rajan.kc@gmail.com');
        console.log('  Workers:   ram.photography@gmail.com, priya.decor@gmail.com');
        console.log('             bikash.video@gmail.com, anita.mehendi@gmail.com');
        console.log('  Admin:     admin@eventkraft.com (password: admin123)');

    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        console.error(err);
    } finally {
        await pool.end();
        process.exit();
    }
}


// ── Helper Functions ────────────────────────────────────────

async function createUser(email, hash, role, firstName, lastName, city) {
    const user = await pool.query(
        `INSERT INTO users (email, password_hash, role, is_verified, is_active)
         VALUES ($1, $2, $3, true, true)
         ON CONFLICT (email) DO UPDATE SET email = $1
         RETURNING id`,
        [email, hash, role]
    );
    const userId = user.rows[0].id;

    await pool.query(
        `INSERT INTO profiles (user_id, first_name, last_name, city)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET first_name = $2`,
        [userId, firstName, lastName, city]
    );

    return userId;
}

async function createGig(workerId, categoryId, title, description, startingPrice, status) {
    const result = await pool.query(
        `INSERT INTO service_gigs (worker_id, category_id, title, description, starting_price, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [workerId, categoryId, title, description, startingPrice, status]
    );
    return result.rows[0].id;
}

async function createPackages(gigId, packages) {
    for (const pkg of packages) {
        await pool.query(
            `INSERT INTO gig_packages (gig_id, tier, title, price, delivery_time, features)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [gigId, pkg.tier, pkg.title, pkg.price, pkg.delivery_time, JSON.stringify(pkg.features)]
        );
    }
}

async function createJob(customerId, categoryId, title, description, eventType, eventDate, location, budgetMin, budgetMax, status) {
    const result = await pool.query(
        `INSERT INTO job_postings (customer_id, category_id, title, description, event_type, event_date, event_location, budget_min, budget_max, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [customerId, categoryId, title, description, eventType, eventDate, location, budgetMin, budgetMax, status]
    );
    return result.rows[0].id;
}

async function createProposal(jobId, workerId, coverLetter, price, duration) {
    await pool.query(
        `INSERT INTO proposals (job_id, worker_id, cover_letter, proposed_price, estimated_duration, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [jobId, workerId, coverLetter, price, duration]
    );
}

// Run it
seed();

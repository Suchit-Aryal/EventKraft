// ============================================================
// Seed Script — Rich demo data for EventKraft
// Run: node database/seed.js   (requires `npm run db:setup` first —
// the admin account must exist for KYC review records)
//
// Creates: 3 customers, 4 fully verified workers, 6 active gigs
// with packages & real photos, 3 job postings, 3 proposals,
// 5 bookings (one per lifecycle stage) with matching transactions,
// 3 reviews, 1 chat conversation and 3 notifications.
// All demo accounts use the password: password123
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Real Unsplash photos (whitelisted in the app's CSP imgSrc)
const PHOTOS = {
    wedding1: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80',
    wedding2: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
    wedding3: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&q=80',
    couple1: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80',
    couple2: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&q=80',
    decor1: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&q=80',
    decor2: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80',
    decor3: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80',
    camera1: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80',
    camera2: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&q=80',
    mehendi1: 'https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=1200&q=80',
    mehendi2: 'https://images.unsplash.com/photo-1610173826608-bd1f53a52db1?w=1200&q=80',
    food1: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
    food2: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&q=80',
    food3: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=1200&q=80',
    dj1: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80',
    dj2: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
    party1: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1200&q=80',
};

function avatar(name, hex) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=${hex}&color=fff&bold=true`;
}

function money(n) {
    return parseFloat(Number(n).toFixed(2));
}

// Reads the commission tiers seeded by database/setup.js
async function getCommission(totalAmount) {
    const result = await pool.query(
        `SELECT rate FROM commission_settings
         WHERE is_active = true AND min_amount <= $1
           AND (max_amount IS NULL OR max_amount >= $1)
         ORDER BY min_amount DESC LIMIT 1`,
        [totalAmount]
    );
    const rate = result.rows.length > 0 ? parseFloat(result.rows[0].rate) : 10.0;
    const commission = money((totalAmount * rate) / 100);
    return {
        rate,
        commission,
        workerEarning: money(totalAmount - commission),
        advance: money(totalAmount * 0.30),
        final: money(totalAmount * 0.70),
    };
}

// ─── Users ──────────────────────────────────────────────────

async function createUser({ email, hash, role, firstName, lastName, city, phone, bio, avatarHex, tagline, skills }) {
    const fullName = `${firstName} ${lastName}`;
    const userResult = await pool.query(
        `INSERT INTO users (email, phone, password_hash, role, is_verified, is_active, profile_complete, tagline, skills)
         VALUES ($1, $2, $3, $4, true, true, true, $5, $6)
         ON CONFLICT (email) DO UPDATE SET
            role = EXCLUDED.role,
            is_verified = true, is_active = true, profile_complete = true,
            tagline = EXCLUDED.tagline, skills = EXCLUDED.skills
         RETURNING id`,
        [email, phone || null, hash, role, tagline || null, skills || null]
    );
    const userId = userResult.rows[0].id;

    await pool.query(
        `INSERT INTO profiles (user_id, first_name, last_name, city, bio, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
            first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
            city = EXCLUDED.city, bio = EXCLUDED.bio, avatar_url = EXCLUDED.avatar_url`,
        [userId, firstName, lastName, city, bio || null, avatar(fullName, avatarHex)]
    );
    return userId;
}

// Mark a worker fully verification-ready (KYC approved + admin verified)
// so canPostService passes, and record the approval in kyc_submissions.
async function approveWorkerKyc(userId, adminId, documentType) {
    await pool.query(`UPDATE users SET kyc_status = 'approved' WHERE id = $1`, [userId]);
    await pool.query(`UPDATE profiles SET is_admin_verified = true WHERE user_id = $1`, [userId]);
    await pool.query(
        `INSERT INTO kyc_submissions
            (user_id, document_type, doc_front_url, doc_back_url, status, reviewed_by, submitted_at, reviewed_at)
         VALUES ($1, $2, $3, $4, 'approved', $5, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days')
         ON CONFLICT (user_id) DO UPDATE SET
            status = 'approved', reviewed_by = EXCLUDED.reviewed_by, reviewed_at = NOW() - INTERVAL '9 days'`,
        [userId, documentType,
         'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
         'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&q=80',
         adminId]
    );
}

// ─── Gigs & packages ────────────────────────────────────────

async function createGig({ workerId, categoryId, title, description, startingPrice, deliveryTime, tags, images, packages, legacyTitles = [] }) {
    // Match the new title or titles used by older seed versions so re-runs
    // upgrade existing demo gigs in place instead of duplicating them.
    const titles = [title, ...legacyTitles];
    const existing = await pool.query(
        'SELECT id FROM service_gigs WHERE worker_id = $1 AND title = ANY($2) ORDER BY created_at',
        [workerId, titles]
    );
    let gigId;
    if (existing.rows.length > 0) {
        gigId = existing.rows[0].id;
        await pool.query(
            `UPDATE service_gigs SET
                category_id = $2, title = $3, description = $4, tags = $5,
                portfolio_images = $6, delivery_time = $7, starting_price = $8, status = 'active'
             WHERE id = $1`,
            [gigId, categoryId, title, description, JSON.stringify(tags), JSON.stringify(images), deliveryTime, startingPrice]
        );
        // Duplicates left behind by the old non-idempotent seed: pause them
        // (kept in the database, hidden from the marketplace).
        const dupIds = existing.rows.slice(1).map(r => r.id);
        if (dupIds.length > 0) {
            await pool.query(`UPDATE service_gigs SET status = 'paused' WHERE id = ANY($1)`, [dupIds]);
        }
    } else {
        const result = await pool.query(
            `INSERT INTO service_gigs
                (worker_id, category_id, title, description, tags, portfolio_images, delivery_time, starting_price, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
             RETURNING id`,
            [workerId, categoryId, title, description, JSON.stringify(tags), JSON.stringify(images), deliveryTime, startingPrice]
        );
        gigId = result.rows[0].id;
    }

    const tiers = ['basic', 'standard', 'premium'];
    for (let i = 0; i < packages.length; i++) {
        const p = packages[i];
        await pool.query(
            `INSERT INTO gig_packages (gig_id, tier, title, description, price, delivery_time, features)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (gig_id, tier) DO UPDATE SET
                title = EXCLUDED.title, description = EXCLUDED.description,
                price = EXCLUDED.price, delivery_time = EXCLUDED.delivery_time,
                features = EXCLUDED.features`,
            [gigId, tiers[i], p.title, p.description, p.price, p.delivery, JSON.stringify(p.features)]
        );
    }
    return gigId;
}

// ─── Jobs & proposals ───────────────────────────────────────

async function createJob({ customerId, categoryId, title, description, eventType, eventDate, location, budgetMin, budgetMax, deadline, legacyTitles = [] }) {
    const titles = [title, ...legacyTitles];
    const existing = await pool.query(
        'SELECT id FROM job_postings WHERE customer_id = $1 AND title = ANY($2) ORDER BY created_at',
        [customerId, titles]
    );
    if (existing.rows.length > 0) {
        const jobId = existing.rows[0].id;
        await pool.query(
            `UPDATE job_postings SET
                category_id = $2, title = $3, description = $4, event_type = $5, event_date = $6,
                event_location = $7, budget_min = $8, budget_max = $9, proposal_deadline = $10, status = 'published'
             WHERE id = $1`,
            [jobId, categoryId, title, description, eventType, eventDate, location, budgetMin, budgetMax, deadline]
        );
        // Close duplicates left behind by the old non-idempotent seed
        const dupIds = existing.rows.slice(1).map(r => r.id);
        if (dupIds.length > 0) {
            await pool.query(`UPDATE job_postings SET status = 'closed' WHERE id = ANY($1)`, [dupIds]);
        }
        return jobId;
    }
    const result = await pool.query(
        `INSERT INTO job_postings
            (customer_id, category_id, title, description, event_type, event_date, event_location, budget_min, budget_max, proposal_deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'published')
         RETURNING id`,
        [customerId, categoryId, title, description, eventType, eventDate, location, budgetMin, budgetMax, deadline]
    );
    return result.rows[0].id;
}

async function createProposal({ jobId, workerId, coverLetter, price, duration }) {
    await pool.query(
        `INSERT INTO proposals (job_id, worker_id, cover_letter, proposed_price, estimated_duration, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         ON CONFLICT (job_id, worker_id) DO NOTHING`,
        [jobId, workerId, coverLetter, price, duration]
    );
}

// ─── Bookings & transactions ────────────────────────────────

async function createBooking({ customerId, workerId, gigId, packageId, totalAmount, eventDate, eventLocation, requirements, stage }) {
    const m = await getCommission(totalAmount);
    const now = new Date();
    const fields = {
        status: 'pending',
        accepted_at: null, advance_deadline: null,
        advance_amount: null, final_amount: null,
        advance_paid_at: null, advance_esewa_ref_id: null,
        final_paid_at: null, final_esewa_ref_id: null,
        completed_at: null,
    };

    if (['accepted', 'paid_advance', 'completed'].includes(stage)) {
        fields.status = 'accepted';
        fields.accepted_at = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        fields.advance_deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        fields.advance_amount = m.advance;
        fields.final_amount = m.final;
    }
    if (['paid_advance', 'completed'].includes(stage)) {
        fields.status = 'paid_advance';
        fields.advance_paid_at = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        fields.advance_esewa_ref_id = 'DEMO-ADV-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    }
    if (stage === 'completed') {
        fields.status = 'completed';
        fields.final_paid_at = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        fields.final_esewa_ref_id = 'DEMO-FIN-' + Math.random().toString(36).slice(2, 10).toUpperCase();
        fields.completed_at = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    }

    // Reuse a matching demo booking from a previous run and converge it to
    // the intended lifecycle stage; otherwise insert a new one.
    const existing = await pool.query(
        'SELECT id FROM bookings WHERE customer_id = $1 AND worker_id = $2 AND gig_id = $3 AND total_amount = $4 ORDER BY created_at',
        [customerId, workerId, gigId, totalAmount]
    );
    let bookingId;
    let created = false;
    if (existing.rows.length > 0) {
        bookingId = existing.rows[0].id;
        // Cancel duplicates left behind by the old non-idempotent seed
        const dupIds = existing.rows.slice(1).map(r => r.id);
        if (dupIds.length > 0) {
            await pool.query(`UPDATE bookings SET status = 'cancelled' WHERE id = ANY($1)`, [dupIds]);
        }
        await pool.query(
            `UPDATE bookings SET
                package_id = COALESCE(package_id, $2),
                commission_rate = $3, commission_amount = $4, worker_earning = $5,
                event_date = $6, event_location = $7, requirements = $8, status = $9,
                accepted_at = $10, advance_deadline = $11, advance_amount = $12, final_amount = $13,
                advance_paid_at = $14, advance_esewa_ref_id = COALESCE(advance_esewa_ref_id, $15),
                final_paid_at = $16, final_esewa_ref_id = COALESCE(final_esewa_ref_id, $17),
                completed_at = $18
             WHERE id = $1`,
            [bookingId, packageId || null,
             m.rate, m.commission, m.workerEarning,
             eventDate, eventLocation, requirements || null, fields.status,
             fields.accepted_at, fields.advance_deadline, fields.advance_amount, fields.final_amount,
             fields.advance_paid_at, fields.advance_esewa_ref_id,
             fields.final_paid_at, fields.final_esewa_ref_id, fields.completed_at]
        );
    } else {
        const result = await pool.query(
            `INSERT INTO bookings
                (customer_id, worker_id, gig_id, package_id, total_amount,
                 commission_rate, commission_amount, worker_earning,
                 event_date, event_location, requirements, status,
                 accepted_at, advance_deadline, advance_amount, final_amount,
                 advance_paid_at, advance_esewa_ref_id,
                 final_paid_at, final_esewa_ref_id, completed_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
             RETURNING id`,
            [customerId, workerId, gigId, packageId || null, totalAmount,
             m.rate, m.commission, m.workerEarning,
             eventDate, eventLocation, requirements || null, fields.status,
             fields.accepted_at, fields.advance_deadline, fields.advance_amount, fields.final_amount,
             fields.advance_paid_at, fields.advance_esewa_ref_id,
             fields.final_paid_at, fields.final_esewa_ref_id, fields.completed_at]
        );
        bookingId = result.rows[0].id;
        created = true;
    }

    // Matching ledger entries: advance carries no commission, the final
    // payment carries the full commission. Guarded so re-runs don't double-post.
    const hasTxn = async (type) => {
        const r = await pool.query('SELECT 1 FROM transactions WHERE booking_id = $1 AND type = $2', [bookingId, type]);
        return r.rows.length > 0;
    };
    if (['paid_advance', 'completed'].includes(stage) && !(await hasTxn('advance_payment'))) {
        await pool.query(
            `INSERT INTO transactions (booking_id, payer_id, payee_id, amount, commission, net_amount, type, status, payment_method)
             VALUES ($1, $2, $3, $4, 0, $4, 'advance_payment', 'completed', 'esewa')`,
            [bookingId, customerId, workerId, m.advance]
        );
    }
    if (stage === 'completed' && !(await hasTxn('final_payment'))) {
        await pool.query(
            `INSERT INTO transactions (booking_id, payer_id, payee_id, amount, commission, net_amount, type, status, payment_method)
             VALUES ($1, $2, $3, $4, $5, $6, 'final_payment', 'completed', 'esewa')`,
            [bookingId, customerId, workerId, m.final, m.commission, money(m.final - m.commission)]
        );
    }
    return { id: bookingId, created };
}

// ─── Reviews & notifications ────────────────────────────────

async function createReview({ bookingId, reviewerId, revieweeId, rating, comment }) {
    await pool.query(
        `INSERT INTO reviews
            (booking_id, reviewer_id, reviewee_id, rating,
             quality_rating, professionalism_rating, communication_rating, value_rating, timeliness_rating, comment)
         VALUES ($1, $2, $3, $4, $4, $4, $4, $4, $4, $5)
         ON CONFLICT (booking_id, reviewer_id) DO NOTHING`,
        [bookingId, reviewerId, revieweeId, rating, comment]
    );
    // Recalculate the reviewee's aggregate rating
    await pool.query(
        `UPDATE profiles SET
            avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE reviewee_id = $1), 0),
            total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1)
         WHERE user_id = $1`,
        [revieweeId]
    );
}

async function createNotificationRow(userId, type, title, message, link) {
    const existing = await pool.query(
        'SELECT id FROM notifications WHERE user_id = $1 AND type = $2 AND title = $3',
        [userId, type, title]
    );
    if (existing.rows.length > 0) return;
    await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, title, message, link]
    );
}

// ─── Main ───────────────────────────────────────────────────

async function seed() {
    console.log('🌱 Seeding EventKraft with rich demo data...\n');

    try {
        const adminResult = await pool.query(`SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1`);
        if (adminResult.rows.length === 0) {
            throw new Error('No admin user found. Run `npm run db:setup` first.');
        }
        const adminId = adminResult.rows[0].id;

        const hash = await bcrypt.hash('password123', 10);

        // ── Customers ───────────────────────────────────────
        console.log('👤 Creating 3 customers...');
        const aarav = await createUser({
            email: 'aarav.sharma@gmail.com', hash, role: 'customer',
            firstName: 'Aarav', lastName: 'Sharma', city: 'Kathmandu', phone: '+9779841000001',
            bio: 'Planning my wedding in Kathmandu and looking for the best event professionals in the valley.',
            avatarHex: '4f46e5',
        });
        const sita = await createUser({
            email: 'sita.thapa@gmail.com', hash, role: 'customer',
            firstName: 'Sita', lastName: 'Thapa', city: 'Pokhara', phone: '+9779841000002',
            bio: 'Event enthusiast from Pokhara. I organise family functions, pujas and community celebrations.',
            avatarHex: '0d9488',
        });
        const rajan = await createUser({
            email: 'rajan.kc@gmail.com', hash, role: 'customer',
            firstName: 'Rajan', lastName: 'KC', city: 'Bhaktapur', phone: '+9779841000003',
            bio: 'Organising corporate events and receptions in Bhaktapur. Always looking for reliable vendors.',
            avatarHex: 'b45309',
        });
        console.log('   ✅ Customers ready\n');

        // ── Workers (fully profile-ready) ───────────────────
        console.log('📸 Creating 4 verified workers...');
        const ram = await createUser({
            email: 'ram.photography@gmail.com', hash, role: 'worker',
            firstName: 'Ram', lastName: 'Maharjan', city: 'Kathmandu', phone: '+9779851000001',
            tagline: 'Award-winning wedding photographer in Kathmandu',
            skills: ['Wedding Photography', 'Portrait Photography', 'Photo Editing', 'Drone Shots'],
            bio: 'I am a professional wedding photographer based in Kathmandu with more than ten years of experience capturing weddings, receptions and engagement ceremonies across the valley. My style blends candid documentary moments with carefully composed portraits, so couples get a complete story of their day. I work with a two-person team, professional full-frame cameras, prime lenses and studio lighting, and I deliver fully edited, print-ready albums within two weeks of the event.',
            avatarHex: '7c3aed',
        });
        const priya = await createUser({
            email: 'priya.decor@gmail.com', hash, role: 'worker',
            firstName: 'Priya', lastName: 'Shrestha', city: 'Lalitpur', phone: '+9779851000002',
            tagline: 'Luxury wedding & event decoration studio',
            skills: ['Wedding Decoration', 'Mandap Design', 'Floral Art', 'Catering', 'Stage Setup'],
            bio: 'I run a boutique decoration studio in Lalitpur that designs and builds complete wedding environments, from traditional mandaps and floral gates to modern reception stages and table styling. Over the past eight years my team has decorated more than two hundred weddings, receptions and corporate galas across the Kathmandu valley. We handle everything in-house including fabric draping, fresh flowers, lighting and furniture, and we also offer full-service boutique catering for intimate events.',
            avatarHex: 'db2777',
        });
        const bikash = await createUser({
            email: 'bikash.video@gmail.com', hash, role: 'worker',
            firstName: 'Bikash', lastName: 'Tamang', city: 'Kathmandu', phone: '+9779851000003',
            tagline: '4K cinematic videographer & professional DJ',
            skills: ['Wedding Videography', '4K Video', 'Drone Videography', 'DJ', 'Live Sound'],
            bio: 'I am a cinematic videographer and professional DJ from Kathmandu. On the video side I shoot weddings and events in true 4K with gimbal-stabilised cameras and licensed drone coverage, then edit highlight films with colour grading and licensed music. On the music side I have played more than three hundred weddings, receptions and corporate parties with a full professional sound and lighting rig. Couples often book me for both so the film and the party are perfectly in sync.',
            avatarHex: '2563eb',
        });
        const anita = await createUser({
            email: 'anita.mehendi@gmail.com', hash, role: 'worker',
            firstName: 'Anita', lastName: 'Gurung', city: 'Pokhara', phone: '+9779851000004',
            tagline: 'Bridal mehendi artist — intricate, long-lasting designs',
            skills: ['Bridal Mehendi', 'Arabic Mehendi', 'Henna Art', 'Guest Mehendi'],
            bio: 'I am a bridal mehendi artist based in Pokhara specialising in intricate traditional and modern henna designs. Over the last six years I have worked with hundreds of brides across Gandaki province, creating full bridal hands and feet, elegant Arabic patterns and quick festive designs for guests. I use only natural, organically sourced henna that I grind and mix myself, which gives a deep, long-lasting stain that is completely safe for skin. I travel to venues across Pokhara and Kathmandu.',
            avatarHex: '16a34a',
        });

        for (const [workerId, doc] of [[ram, 'national_id'], [priya, 'passport'], [bikash, 'national_id'], [anita, 'nagarikta']]) {
            await approveWorkerKyc(workerId, adminId, doc);
        }
        console.log('   ✅ Workers ready (KYC approved, admin verified)\n');

        // ── Categories ──────────────────────────────────────
        const cats = await pool.query('SELECT id, slug FROM categories');
        const catMap = {};
        cats.rows.forEach(c => { catMap[c.slug] = c.id; });

        // ── Gigs with packages ──────────────────────────────
        console.log('🎨 Creating 6 service gigs with packages...');
        const gigPhoto = await createGig({
            workerId: ram, categoryId: catMap['photography'],
            title: 'Premium Wedding Photography',
            description: 'Capture every emotion of your big day with a dedicated two-person photography team. We cover everything from the morning rituals and baraat to the reception, blending candid documentary moments with classic family portraits. Every package includes professional colour-graded editing, an online gallery for your family, and print-ready high-resolution files delivered within two weeks. Drone coverage and same-day teaser edits are available in the premium tier.',
            startingPrice: 25000, deliveryTime: '14 days',
            tags: ['wedding', 'photography', 'kathmandu', 'candid'],
            images: [PHOTOS.wedding1, PHOTOS.couple1, PHOTOS.camera1],
            packages: [
                { title: 'Essential Coverage', description: 'Single photographer, 6 hours of coverage, 200+ edited photos, online gallery.', price: 25000, delivery: '14 days', features: ['1 photographer', '6 hours coverage', '200+ edited photos', 'Online gallery'] },
                { title: 'Classic Wedding', description: 'Two photographers covering a full day, 500+ edited photos, premium album and online gallery.', price: 50000, delivery: '14 days', features: ['2 photographers', 'Full-day coverage', '500+ edited photos', 'Premium printed album', 'Online gallery'] },
                { title: 'Royal Wedding Story', description: 'Two-day multi-event coverage with drone shots, same-day teaser, luxury album and all raw files.', price: 100000, delivery: '21 days', features: ['2 photographers + assistant', '2-day multi-event coverage', 'Drone aerial shots', 'Same-day teaser edit', 'Luxury album + raw files'] },
            ],
        });

        const gigDecor = await createGig({
            workerId: priya, categoryId: catMap['decoration'],
            title: 'Luxury Wedding Decoration & Mandap Setup',
            description: 'Transform your venue into a breathtaking wedding environment. Our studio designs and builds complete decor concepts: traditional mandaps with fresh floral work, elegant entrance gates, stage and photobooth backdrops, table styling and ambient lighting. We bring our own fabric, flowers, furniture and crew, and we coordinate directly with your venue so the space is ready hours before the first guest arrives. Every design is customised to your colour palette and theme.',
            startingPrice: 50000, deliveryTime: '7 days',
            tags: ['decoration', 'mandap', 'wedding', 'floral'],
            images: [PHOTOS.decor1, PHOTOS.decor2, PHOTOS.decor3],
            packages: [
                { title: 'Elegant Essentials', description: 'Stage backdrop, entrance gate, basic floral arrangements and ambient lighting for one venue.', price: 50000, delivery: '7 days', features: ['Stage backdrop', 'Entrance gate', 'Fresh floral accents', 'Ambient lighting'] },
                { title: 'Signature Wedding', description: 'Full mandap with fresh flowers, stage, entrance, table styling and coordinated lighting design.', price: 120000, delivery: '10 days', features: ['Traditional mandap', 'Full fresh florals', 'Stage + entrance + tables', 'Lighting design', 'On-site crew'] },
                { title: 'Royal Venue Takeover', description: 'Complete venue transformation across ceremony and reception with custom theme, premium florals and furniture.', price: 250000, delivery: '14 days', features: ['Custom theme design', 'Ceremony + reception decor', 'Premium imported florals', 'Lounge furniture', 'Dedicated decor manager'] },
            ],
        });

        const gigVideo = await createGig({
            workerId: bikash, categoryId: catMap['videography'],
            title: 'Cinematic Wedding Videography in 4K',
            legacyTitles: ['Cinematic Wedding Videography'],
            description: 'Your wedding deserves more than a recording — it deserves a film. I shoot in true 4K with gimbal-stabilised cinema cameras, capture licensed drone aerials of your venue, and record crisp audio of your vows and speeches. You receive a colour-graded cinematic highlight film plus a full-length documentary edit of the entire day. Premium packages include a same-day edit screened at your reception and a one-minute social media teaser delivered within 48 hours.',
            startingPrice: 35000, deliveryTime: '21 days',
            tags: ['videography', '4k', 'wedding film', 'drone'],
            images: [PHOTOS.camera2, PHOTOS.wedding2, PHOTOS.couple2],
            packages: [
                { title: 'Highlight Film', description: 'Single videographer, 6 hours coverage, 5-minute cinematic highlight film in 4K.', price: 35000, delivery: '21 days', features: ['1 videographer', '6 hours coverage', '5-min 4K highlight film', 'Colour grading'] },
                { title: 'Wedding Feature', description: 'Two videographers, full-day coverage, highlight film plus 40-minute documentary edit and drone aerials.', price: 65000, delivery: '21 days', features: ['2 videographers', 'Full-day coverage', 'Drone aerials', 'Highlight + 40-min film', 'Licensed music'] },
                { title: 'Cinema Premiere', description: 'Multi-day coverage with same-day edit screened at the reception, social teaser in 48 hours and all raw footage.', price: 110000, delivery: '30 days', features: ['Multi-day coverage', 'Same-day reception edit', '48-hour social teaser', 'Full documentary film', 'All raw footage'] },
            ],
        });

        const gigMehendi = await createGig({
            workerId: anita, categoryId: catMap['mehendi'],
            title: 'Bridal Mehendi — Intricate Traditional & Modern Designs',
            legacyTitles: ['Traditional & Modern Mehendi Art'],
            description: 'Make your hands part of the celebration with intricate bridal mehendi that photographs beautifully and stains deeply. I specialise in full bridal designs that weave your love story into traditional motifs, alongside modern minimalist and Arabic styles. I use only natural henna that I source and grind myself — no chemical dyes, completely safe for skin, with a rich stain that lasts up to three weeks. Guest mehendi packages keep the whole family included on mehendi night.',
            startingPrice: 5000, deliveryTime: '1 day',
            tags: ['mehendi', 'henna', 'bridal', 'pokhara'],
            images: [PHOTOS.mehendi1, PHOTOS.mehendi2],
            packages: [
                { title: 'Festive Hands', description: 'Elegant single-side mehendi for both hands, perfect for festivals and small functions.', price: 5000, delivery: '1 day', features: ['Both hands (front)', 'Natural organic henna', '1.5 hours session'] },
                { title: 'Bridal Classic', description: 'Full bridal mehendi for hands and feet with personalised motifs and aftercare kit.', price: 12000, delivery: '1 day', features: ['Hands up to elbows', 'Feet up to ankles', 'Personalised motifs', 'Aftercare kit'] },
                { title: 'Bridal Royale + Guests', description: 'Complete bridal mehendi plus designs for up to ten family members on mehendi night.', price: 20000, delivery: '1 day', features: ['Full bridal package', 'Up to 10 guests', 'On-venue service', 'Touch-up visit'] },
            ],
        });

        const gigCatering = await createGig({
            workerId: priya, categoryId: catMap['catering'],
            title: 'Boutique Event Catering — Nepali & Continental Menus',
            description: 'Treat your guests to a meal they will talk about long after the event. Our boutique catering arm serves authentic Nepali feasts, live counters and continental menus, all prepared fresh on-site by our chef team. We handle the full dining experience: buffet styling, serving staff, crockery and cleanup, so you can focus on your guests. Menus are fully customisable and we happily arrange tastings before you book. Minimum order covers 50 guests; we comfortably serve up to 1,000.',
            startingPrice: 60000, deliveryTime: '3 days',
            tags: ['catering', 'food', 'wedding', 'buffet'],
            images: [PHOTOS.food1, PHOTOS.food2, PHOTOS.food3],
            packages: [
                { title: 'Classic Buffet (50 pax)', description: 'Traditional Nepali buffet with 8 dishes, serving staff and full setup for up to 50 guests.', price: 60000, delivery: '3 days', features: ['Up to 50 guests', '8-dish Nepali menu', 'Serving staff', 'Buffet setup + cleanup'] },
                { title: 'Premium Feast (100 pax)', description: '12-dish Nepali and continental menu with live momo counter and dessert station for 100 guests.', price: 120000, delivery: '5 days', features: ['Up to 100 guests', '12-dish mixed menu', 'Live momo counter', 'Dessert station', 'Premium crockery'] },
                { title: 'Grand Banquet (200 pax)', description: 'Full banquet for 200 guests with live counters, welcome drinks, themed buffet styling and dedicated captain.', price: 220000, delivery: '7 days', features: ['Up to 200 guests', 'Live cooking counters', 'Welcome drinks', 'Themed buffet styling', 'Dedicated catering captain'] },
            ],
        });

        const gigDj = await createGig({
            workerId: bikash, categoryId: catMap['music-dj'],
            title: 'Wedding & Reception DJ with Pro Sound and Lighting',
            description: 'Keep the dance floor packed from the first beat to the last song. I bring a complete professional rig — line-array sound, intelligent lighting, wireless mics and a backup system — and a music library spanning Nepali hits, Bollywood, Western pop and classic dance anthems. I read the crowd live and take family requests gracefully, and I always coordinate with your emcee and videographer so the key moments land perfectly. Setup and soundcheck happen hours before guests arrive.',
            startingPrice: 15000, deliveryTime: '1 day',
            tags: ['dj', 'music', 'reception', 'party'],
            images: [PHOTOS.dj1, PHOTOS.dj2, PHOTOS.party1],
            packages: [
                { title: 'Party Starter', description: '4 hours of DJ with quality sound system and dance lighting, ideal for small receptions.', price: 15000, delivery: '1 day', features: ['4 hours DJ set', 'Pro sound system', 'Dance floor lighting', 'Wireless mic'] },
                { title: 'Reception Pro', description: 'Full evening coverage with premium sound, intelligent lighting, emcee coordination and custom playlist.', price: 28000, delivery: '1 day', features: ['Up to 7 hours', 'Premium line-array sound', 'Intelligent lighting', 'Custom playlist', 'Emcee coordination'] },
                { title: 'Grand Celebration', description: 'Multi-event package covering mehendi night and reception with full production, LED wall and live mixing.', price: 45000, delivery: '2 days', features: ['2 events covered', 'Full production rig', 'LED wall', 'Live mixing + requests', 'Backup system'] },
            ],
        });
        console.log('   ✅ 6 gigs with 18 packages ready\n');

        // ── Job postings ────────────────────────────────────
        console.log('📋 Creating 3 published job postings...');
        const job1 = await createJob({
            customerId: aarav, categoryId: catMap['photography'],
            title: 'Wedding Photographer Wanted for 3-Day Kathmandu Wedding',
            legacyTitles: ['Looking for Wedding Photographer — Kathmandu'],
            description: 'We are getting married in June and looking for an experienced photographer to cover three days of events: mehendi night, the main wedding ceremony and the evening reception. We want a mix of candid coverage and traditional family portraits, and we would love drone shots of the venue if possible. Please share your portfolio and a package that covers all three days with edited photos delivered within a month.',
            eventType: 'Wedding', eventDate: '2026-06-15', location: 'Kathmandu',
            budgetMin: 30000, budgetMax: 80000, deadline: '2026-06-13',
        });
        const job2 = await createJob({
            customerId: sita, categoryId: catMap['decoration'],
            title: 'Full Venue Decoration for Lakeside Wedding in Pokhara',
            legacyTitles: ['Full Wedding Decoration Needed — Pokhara'],
            description: 'Seeking a decoration team for a 300-guest wedding at a lakeside venue in Pokhara. We need a traditional mandap with fresh flowers, an elegant entrance gate, stage decoration for the reception, table centrepieces and coordinated lighting throughout the venue. The theme is ivory and marigold with traditional Nepali touches. Please include setup and teardown in your proposal — the venue gives us access from 6 AM on the event day.',
            eventType: 'Wedding', eventDate: '2026-07-20', location: 'Pokhara',
            budgetMin: 100000, budgetMax: 200000, deadline: '2026-07-15',
        });
        const job3 = await createJob({
            customerId: rajan, categoryId: catMap['music-dj'],
            title: 'Reception DJ Needed for Corporate Anniversary Party',
            legacyTitles: ['DJ for Reception Party — Bhaktapur'],
            description: 'Our company is celebrating its 10th anniversary with an evening reception in Bhaktapur for around 150 guests. We need a DJ with a professional sound system and lighting who can handle background music during dinner and then run a high-energy dance segment afterwards. A wireless mic setup for speeches is essential. The event runs from 6 PM to 11 PM. Please quote including all equipment and setup time.',
            eventType: 'Corporate Event', eventDate: '2026-08-10', location: 'Bhaktapur',
            budgetMin: 15000, budgetMax: 30000, deadline: '2026-08-05',
        });

        // ── Proposals ───────────────────────────────────────
        await createProposal({
            jobId: job1, workerId: ram, price: 45000, duration: '3 days + 3 weeks editing',
            coverLetter: 'Namaste Aarav ji! Congratulations on your upcoming wedding. I have photographed over 150 weddings in Kathmandu in the last decade, including many multi-day celebrations exactly like yours. For your three days I would bring my two-person team, cover the mehendi and ceremony candidly, and set up classic family portraits at the reception. Drone aerials of the venue are included at no extra cost since I am a licensed operator. You would receive 800+ edited photos and a premium album within three weeks. My portfolio is on my profile — I would love to capture your story.',
        });
        await createProposal({
            jobId: job1, workerId: bikash, price: 65000, duration: '3 days + 4 weeks delivery',
            coverLetter: 'Hi Aarav, while I am primarily known for cinematic videography, I work alongside a senior photographer partner and we offer a combined photo + 4K film package that would cover all three of your days. You would get full photographic coverage plus a cinematic highlight film with drone aerials — two crafts, one coordinated team, so nobody trips over each other at your venue. Everything is delivered in four weeks: 600+ edited photos, a 5-minute film and a full ceremony edit. Happy to do a video call to walk you through recent weddings we covered together.',
        });
        await createProposal({
            jobId: job2, workerId: priya, price: 150000, duration: '2 days setup + event day',
            coverLetter: 'Dear Sita ji, your ivory and marigold lakeside theme is exactly the kind of design our studio loves. We recently decorated two lakeside weddings in Pokhara, so we know the local venues, the wind off the lake (important for draping!) and the best local flower suppliers for fresh marigold at scale. Our proposal covers a full traditional mandap, a 12-foot floral entrance gate, reception stage, centrepieces for 30 tables and warm festoon lighting across the venue, with our own crew handling setup from 6 AM and full teardown after the event. I would be glad to share a mood board before you decide.',
        });
        console.log('   ✅ 3 jobs + 3 proposals ready\n');

        // ── Bookings (one per lifecycle stage) ──────────────
        console.log('📅 Creating 5 bookings across the lifecycle...');

        const pkg = async (gigId, tier) => {
            const r = await pool.query('SELECT id FROM gig_packages WHERE gig_id = $1 AND tier = $2', [gigId, tier]);
            return r.rows[0] ? r.rows[0].id : null;
        };

        // 1. pending — Rajan → Bikash (DJ, Reception Pro 28k)
        const b1 = await createBooking({
            customerId: rajan, workerId: bikash, gigId: gigDj, packageId: await pkg(gigDj, 'standard'),
            totalAmount: 28000, stage: 'pending',
            eventDate: '2026-08-10', eventLocation: 'Bhaktapur Durbar Banquet, Bhaktapur',
            requirements: 'Corporate anniversary — background dinner music until 8 PM, then dance floor. Wireless mics for two speeches.',
        });

        // 2. accepted — Aarav → Ram (photography, Classic Wedding 50k)
        const b2 = await createBooking({
            customerId: aarav, workerId: ram, gigId: gigPhoto, packageId: await pkg(gigPhoto, 'standard'),
            totalAmount: 50000, stage: 'accepted',
            eventDate: '2026-06-15', eventLocation: 'Hyatt Regency, Boudha, Kathmandu',
            requirements: 'Full-day coverage of the main wedding ceremony. Family portrait list will be shared a week before.',
        });

        // 3. paid_advance — Sita → Priya (decoration, Signature Wedding 120k)
        const b3 = await createBooking({
            customerId: sita, workerId: priya, gigId: gigDecor, packageId: await pkg(gigDecor, 'standard'),
            totalAmount: 120000, stage: 'paid_advance',
            eventDate: '2026-07-20', eventLocation: 'Waterfront Resort, Lakeside, Pokhara',
            requirements: 'Ivory & marigold theme. Mandap facing the lake, stage for reception, 30 table centrepieces.',
        });

        // 4. completed — Sita → Anita (mehendi, Bridal Classic 12k)
        const b4 = await createBooking({
            customerId: sita, workerId: anita, gigId: gigMehendi, packageId: await pkg(gigMehendi, 'standard'),
            totalAmount: 12000, stage: 'completed',
            eventDate: '2026-05-28', eventLocation: 'Private residence, Lakeside, Pokhara',
            requirements: 'Bridal mehendi for my niece — hands to elbows and feet. Family wants traditional peacock motifs.',
        });

        // 5. completed — Aarav → Bikash (videography, Wedding Feature 65k)
        const b5 = await createBooking({
            customerId: aarav, workerId: bikash, gigId: gigVideo, packageId: await pkg(gigVideo, 'standard'),
            totalAmount: 65000, stage: 'completed',
            eventDate: '2026-05-20', eventLocation: 'Gokarna Forest Resort, Kathmandu',
            requirements: 'Engagement ceremony film — highlight reel plus full documentary edit with drone aerials.',
        });

        // Keep workers' completed counters consistent with their bookings
        await pool.query(`
            UPDATE profiles p SET total_completed = (
                SELECT COUNT(*) FROM bookings b
                WHERE b.worker_id = p.user_id AND b.status IN ('completed', 'paid_final')
            )
            WHERE p.user_id IN (SELECT DISTINCT worker_id FROM bookings)
        `);
        console.log('   ✅ Bookings + transaction ledger ready\n');

        // ── Reviews ─────────────────────────────────────────
        console.log('⭐ Creating reviews...');
        await createReview({
            bookingId: b4.id, reviewerId: sita, revieweeId: anita, rating: 5,
            comment: 'Anita is incredibly talented! The bridal mehendi she did for my niece was breathtaking — the peacock motifs were so detailed that guests kept photographing her hands all evening. The natural henna stained a deep beautiful red and lasted well past the wedding. She was punctual, calm and lovely with the whole family. Booking her again for my own ceremony!',
        });
        await createReview({
            bookingId: b5.id, reviewerId: aarav, revieweeId: bikash, rating: 5,
            comment: 'Bikash delivered far beyond what we expected. The 4K highlight film of our engagement looks like a movie trailer — the drone shots over Gokarna forest at sunset gave everyone goosebumps. He was invisible during the ceremony but somehow caught every important moment, and the final edit arrived two days early. Worth every rupee.',
        });
        await createReview({
            bookingId: b5.id, reviewerId: bikash, revieweeId: aarav, rating: 5,
            comment: 'Aarav was a dream client — clear about what he wanted, shared the event schedule in advance, and made sure my crew had venue access for the drone flight window. Payments were prompt at every stage. Highly recommended to any fellow service provider on EventKraft.',
        });
        console.log('   ✅ 3 five-star reviews ready\n');

        // ── Conversation + messages ─────────────────────────
        console.log('💬 Creating a demo conversation...');
        const convo = await pool.query(
            `SELECT id FROM conversations
             WHERE (participant_1 = $1 AND participant_2 = $2) OR (participant_1 = $2 AND participant_2 = $1)
             LIMIT 1`,
            [aarav, ram]
        );
        if (convo.rows.length === 0) {
            const created = await pool.query(
                `INSERT INTO conversations (participant_1, participant_2, booking_id, last_message_at)
                 VALUES ($1, $2, $3, NOW()) RETURNING id`,
                [aarav, ram, b2.id]
            );
            const convoId = created.rows[0].id;

            const chat = [
                [aarav, ram, 'Namaste Ram ji! I saw your wedding photography portfolio and the candid shots are exactly the style we want. Is your Classic Wedding package available on June 15th?'],
                [ram, aarav, 'Namaste Aarav ji, congratulations on the wedding! Yes, June 15th is open. The Classic Wedding package covers the full day with two photographers, 500+ edited photos and a premium album. Where is the venue?'],
                [aarav, ram, 'Hyatt Regency in Boudha. The ceremony starts around 10 AM and the reception goes into the evening. Would you also be able to cover the family portrait session between the two?'],
                [ram, aarav, 'Hyatt is a beautiful venue to shoot — great light in the courtyard. Family portraits between events are absolutely included; just share the portrait list a week before so we can plan groupings efficiently. Shall I send the booking through?'],
                [aarav, ram, 'Perfect, I have placed the booking for the Classic Wedding package. Looking forward to working with you — dhanyabad!'],
            ];
            for (const [sender, receiver, content] of chat) {
                await pool.query(
                    `INSERT INTO messages (conversation_id, sender_id, receiver_id, content, message_type, is_read)
                     VALUES ($1, $2, $3, $4, 'text', true)`,
                    [convoId, sender, receiver, content]
                );
            }
        }
        console.log('   ✅ Conversation ready\n');

        // ── Notifications ───────────────────────────────────
        console.log('🔔 Creating notifications...');
        await createNotificationRow(aarav, 'booking_accepted', 'Booking Accepted — Action Required',
            'Your booking for "Premium Wedding Photography" was accepted. Pay the advance of NPR 15,000 within 24 hours to confirm.',
            `/bookings/${b2.id}/agreement`);
        await createNotificationRow(priya, 'advance_received', 'Advance Payment Received',
            'Advance payment of NPR 36,000 has been received for the Signature Wedding decoration booking.',
            `/bookings/${b3.id}`);
        await createNotificationRow(ram, 'kyc_approved', 'Your identity has been verified!',
            'You now have a Verified badge and can post services on EventKraft.',
            '/dashboard');
        console.log('   ✅ Notifications ready\n');

        // ── Summary ─────────────────────────────────────────
        console.log('═══════════════════════════════════════════════════════');
        console.log('✨ Demo data seeded successfully!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('All demo accounts use password: password123');
        console.log('');
        console.log('  ADMIN     admin@eventkraft.com (password: admin123)');
        console.log('');
        console.log('  CUSTOMERS');
        console.log('    aarav.sharma@gmail.com   — Aarav Sharma, Kathmandu');
        console.log('    sita.thapa@gmail.com     — Sita Thapa, Pokhara');
        console.log('    rajan.kc@gmail.com       — Rajan KC, Bhaktapur');
        console.log('');
        console.log('  WORKERS (KYC approved, can post services)');
        console.log('    ram.photography@gmail.com — Ram Maharjan, photographer');
        console.log('    priya.decor@gmail.com     — Priya Shrestha, decor & catering');
        console.log('    bikash.video@gmail.com    — Bikash Tamang, video & DJ');
        console.log('    anita.mehendi@gmail.com   — Anita Gurung, mehendi artist');
        console.log('');
        console.log('  6 gigs · 3 jobs · 3 proposals · 5 bookings (pending →');
        console.log('  accepted → paid_advance → completed ×2) · 3 reviews ·');
        console.log('  1 conversation · 3 notifications');

    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        console.error(err);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seed();

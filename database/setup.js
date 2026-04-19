// ============================================================
// Database Setup Script
// Run once: node database/setup.js
// Creates tables, seeds categories & commission, creates admin
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function setup() {
    console.log('🔧 Starting EventKraft database setup...\n');

    try {
        // ── Step 1: Run schema.sql ──────────────────────────
        console.log('📦 Step 1/3 — Creating tables, enums, indexes, triggers...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log('   ✅ All 15 tables created successfully\n');

        // ── Step 2: Seed commission settings ────────────────
        console.log('💰 Step 2/3 — Seeding commission tiers...');
        await seedCommissions();
        console.log('   ✅ Commission tiers seeded\n');

        // ── Step 3: Create admin account ────────────────────
        console.log('👤 Step 3/3 — Creating admin account...');
        await createAdmin();
        console.log('   ✅ Admin account created\n');

        console.log('═══════════════════════════════════════════');
        console.log('✨ Database setup complete!');
        console.log('═══════════════════════════════════════════');
        console.log('');
        console.log('Admin login:');
        console.log('  Email:    admin@eventkraft.com');
        console.log('  Password: admin123');
        console.log('');
        console.log('Run the server: npm run dev');

    } catch (err) {
        console.error('❌ Setup failed:', err.message);
        console.error(err);
    } finally {
        await pool.end();
        process.exit();
    }
}

// ── Seed Commission Tiers ───────────────────────────────────
async function seedCommissions() {
    // Check if already seeded
    const existing = await pool.query('SELECT COUNT(*) FROM commission_settings');
    if (parseInt(existing.rows[0].count) > 0) {
        console.log('   ⏭  Commission tiers already exist, skipping');
        return;
    }

    // First create a temp admin UUID for updated_by
    // (will be replaced when real admin is created)
    const tiers = [
        { tier_name: 'Micro', min_amount: 0, max_amount: 25000, rate: 5.00 },
        { tier_name: 'Small', min_amount: 25001, max_amount: 100000, rate: 7.00 },
        { tier_name: 'Medium', min_amount: 100001, max_amount: 300000, rate: 10.00 },
        { tier_name: 'Large', min_amount: 300001, max_amount: 500000, rate: 12.00 },
        { tier_name: 'Premium', min_amount: 500001, max_amount: null, rate: 15.00 }
    ];

    // We need a user for updated_by — will create admin first, then use their id
    // For now, create without updated_by using a direct insert
    for (const t of tiers) {
        await pool.query(
            `INSERT INTO commission_settings (tier_name, min_amount, max_amount, rate, updated_by)
             VALUES ($1, $2, $3, $4, (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
             ON CONFLICT DO NOTHING`,
            [t.tier_name, t.min_amount, t.max_amount, t.rate]
        );
    }
}

// ── Create Admin Account ────────────────────────────────────
async function createAdmin() {
    const adminEmail = 'admin@eventkraft.com';

    // Check if admin already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rows.length > 0) {
        console.log('   ⏭  Admin account already exists, skipping');
        return;
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);

    const user = await pool.query(
        `INSERT INTO users (email, password_hash, role, is_verified, is_active)
         VALUES ($1, $2, 'admin', true, true)
         RETURNING id`,
        [adminEmail, hash]
    );

    await pool.query(
        `INSERT INTO profiles (user_id, first_name, last_name, bio)
         VALUES ($1, 'System', 'Admin', 'EventKraft Platform Administrator')`,
        [user.rows[0].id]
    );

    // Now update commission settings with the admin's ID
    await pool.query(
        'UPDATE commission_settings SET updated_by = $1 WHERE updated_by IS NULL',
        [user.rows[0].id]
    );
}

// Run it
setup();

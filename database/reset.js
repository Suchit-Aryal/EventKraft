// ============================================================
// Database Reset Script
// WARNING: Drops ALL tables and recreates from scratch
// Run: node database/reset.js
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = require('../config/db');

async function reset() {
    console.log('⚠️  WARNING: This will DROP all tables and data!\n');

    try {
        // Drop all tables in reverse dependency order
        console.log('🗑️  Dropping all tables...');

        await pool.query(`
            DROP TABLE IF EXISTS commission_settings CASCADE;
            DROP TABLE IF EXISTS disputes CASCADE;
            DROP TABLE IF EXISTS notifications CASCADE;
            DROP TABLE IF EXISTS transactions CASCADE;
            DROP TABLE IF EXISTS messages CASCADE;
            DROP TABLE IF EXISTS conversations CASCADE;
            DROP TABLE IF EXISTS reviews CASCADE;
            DROP TABLE IF EXISTS bookings CASCADE;
            DROP TABLE IF EXISTS gig_packages CASCADE;
            DROP TABLE IF EXISTS service_gigs CASCADE;
            DROP TABLE IF EXISTS proposals CASCADE;
            DROP TABLE IF EXISTS job_postings CASCADE;
            DROP TABLE IF EXISTS categories CASCADE;
            DROP TABLE IF EXISTS profiles CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        `);

        // Drop custom types
        console.log('🗑️  Dropping custom enum types...');
        await pool.query(`
            DROP TYPE IF EXISTS user_role CASCADE;
            DROP TYPE IF EXISTS gender_type CASCADE;
            DROP TYPE IF EXISTS job_status CASCADE;
            DROP TYPE IF EXISTS proposal_status CASCADE;
            DROP TYPE IF EXISTS gig_status CASCADE;
            DROP TYPE IF EXISTS package_tier CASCADE;
            DROP TYPE IF EXISTS booking_status CASCADE;
            DROP TYPE IF EXISTS transaction_type CASCADE;
            DROP TYPE IF EXISTS transaction_status CASCADE;
            DROP TYPE IF EXISTS dispute_status CASCADE;
        `);

        // Drop function and triggers
        await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;');

        console.log('   ✅ All tables and types dropped\n');

        // Now run setup
        console.log('🔄 Re-running setup...\n');
        // Import and run setup inline
        const fs = require('fs');
        const path = require('path');
        const bcrypt = require('bcrypt');

        // Run schema
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schemaSql);
        console.log('   ✅ Schema recreated');

        // Create admin
        const hash = await bcrypt.hash('admin123', 10);
        const admin = await pool.query(
            `INSERT INTO users (email, password_hash, role, is_verified, is_active)
             VALUES ('admin@eventkraft.com', $1, 'admin', true, true) RETURNING id`,
            [hash]
        );
        await pool.query(
            `INSERT INTO profiles (user_id, first_name, last_name, bio)
             VALUES ($1, 'System', 'Admin', 'EventKraft Platform Administrator')`,
            [admin.rows[0].id]
        );
        console.log('   ✅ Admin account recreated');

        // Seed commissions
        const tiers = [
            ['Micro', 0, 25000, 5.00],
            ['Small', 25001, 100000, 7.00],
            ['Medium', 100001, 300000, 10.00],
            ['Large', 300001, 500000, 12.00],
            ['Premium', 500001, null, 15.00]
        ];
        for (const [name, min, max, rate] of tiers) {
            await pool.query(
                `INSERT INTO commission_settings (tier_name, min_amount, max_amount, rate, updated_by)
                 VALUES ($1, $2, $3, $4, $5)`,
                [name, min, max, rate, admin.rows[0].id]
            );
        }
        console.log('   ✅ Commission tiers seeded');

        console.log('\n✨ Database reset complete!');

    } catch (err) {
        console.error('❌ Reset failed:', err.message);
        console.error(err);
    } finally {
        await pool.end();
        process.exit();
    }
}

reset();

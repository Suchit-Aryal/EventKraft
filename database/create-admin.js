// ============================================================
// Quick script to create/fix admin account
// Run: node database/create-admin.js
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function createAdmin() {
    try {
        const email = 'admin@eventkraft.com';
        const password = 'admin123';

        // Delete any existing non-admin account with this email
        await pool.query("DELETE FROM users WHERE email = $1 AND role != 'admin'", [email]);

        // Check if admin already exists
        const existing = await pool.query("SELECT id FROM users WHERE email = $1 AND role = 'admin'", [email]);
        if (existing.rows.length > 0) {
            console.log('✅ Admin account already exists');
            await pool.end();
            process.exit();
            return;
        }

        // Create admin
        const hash = await bcrypt.hash(password, 10);
        const user = await pool.query(
            `INSERT INTO users (email, password_hash, role, is_verified, is_active)
             VALUES ($1, $2, 'admin', true, true)
             RETURNING id`,
            [email, hash]
        );

        // Create profile (ignore conflict if exists)
        await pool.query(
            `INSERT INTO profiles (user_id, first_name, last_name, bio)
             VALUES ($1, 'System', 'Admin', 'EventKraft Platform Administrator')
             ON CONFLICT (user_id) DO UPDATE SET first_name = 'System', last_name = 'Admin'`,
            [user.rows[0].id]
        );

        // Seed commission tiers if empty
        const commCount = await pool.query('SELECT COUNT(*) FROM commission_settings');
        if (parseInt(commCount.rows[0].count) === 0) {
            const tiers = [
                ['Micro', 0, 25000, 5.00],
                ['Small', 25001, 100000, 7.00],
                ['Medium', 100001, 300000, 10.00],
                ['Large', 300001, 500000, 12.00],
                ['Premium', 500001, null, 15.00]
            ];
            for (const [name, min, max, rate] of tiers) {
                await pool.query(
                    'INSERT INTO commission_settings (tier_name, min_amount, max_amount, rate, updated_by) VALUES ($1,$2,$3,$4,$5)',
                    [name, min, max, rate, user.rows[0].id]
                );
            }
            console.log('✅ Commission tiers seeded');
        }

        console.log('═══════════════════════════════════════');
        console.log('✅ Admin account created!');
        console.log('  Email:    admin@eventkraft.com');
        console.log('  Password: admin123');
        console.log('═══════════════════════════════════════');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

createAdmin();

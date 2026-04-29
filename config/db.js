// ============================================================
// Database Connection — PostgreSQL
// ============================================================

const { Pool } = require('pg');

// Parse the connection string to ensure the password is always a string
// (pg library requires password to be a string, but numeric-only passwords
// in URLs can get parsed as numbers)
const connectionString = process.env.DATABASE_URL;

const poolConfig = { connectionString };

// If connecting to Supabase or other cloud providers, enable SSL
if (connectionString && connectionString.includes('supabase')) {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    process.exit(-1);
});

module.exports = pool;

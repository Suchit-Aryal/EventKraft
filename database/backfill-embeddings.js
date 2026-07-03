// ============================================================
// Backfill pgvector embeddings for existing gigs and jobs.
// Usage: node database/backfill-embeddings.js
// Safe to re-run — only rows with NULL embedding are processed.
// ============================================================

require('dotenv').config();
const pool = require('../config/db');
const { updateGigEmbedding, updateJobEmbedding } = require('../utils/embeddingService');

async function main() {
    const gigs = await pool.query('SELECT id, title FROM service_gigs WHERE embedding IS NULL');
    console.log(`Gigs missing embeddings: ${gigs.rows.length}`);
    for (const g of gigs.rows) {
        try {
            await updateGigEmbedding(g.id);
            console.log(`  ✅ gig ${g.title}`);
        } catch (err) {
            console.error(`  ❌ gig ${g.title}: ${err.message}`);
        }
    }

    const jobs = await pool.query('SELECT id, title FROM job_postings WHERE embedding IS NULL');
    console.log(`Jobs missing embeddings: ${jobs.rows.length}`);
    for (const j of jobs.rows) {
        try {
            await updateJobEmbedding(j.id);
            console.log(`  ✅ job ${j.title}`);
        } catch (err) {
            console.error(`  ❌ job ${j.title}: ${err.message}`);
        }
    }

    console.log('Done.');
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

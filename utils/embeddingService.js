// ============================================================
// Embedding Service — Gemini text-embedding-004 (768 dims)
// Powers pgvector semantic recommendations. Failures are
// logged and swallowed: embeddings are an enhancement, the
// category-based SQL fallback still works without them.
// ============================================================

const pool = require('../config/db');

const MODEL = 'gemini-embedding-001';
const TIMEOUT_MS = 15000;

/** Get a 768-dim embedding for a piece of text. */
async function embedText(text) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: `models/${MODEL}`,
            content: { parts: [{ text: text.slice(0, 8000) }] },
            // Keep vectors at 768 dims to match the vector(768) columns
            outputDimensionality: 768,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini embedding HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const values = data.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Gemini embedding returned no values');
    }
    return values;
}

/** pgvector literal: '[0.1,0.2,...]' */
function toVectorLiteral(values) {
    return `[${values.join(',')}]`;
}

function gigToText(gig) {
    return [gig.title, gig.category_name, gig.description]
        .filter(Boolean).join('\n');
}

function jobToText(job) {
    return [job.title, job.category_name, job.event_type, job.event_location, job.description, job.special_requirements]
        .filter(Boolean).join('\n');
}

/** Compute + store the embedding for one service gig. */
async function updateGigEmbedding(gigId) {
    const r = await pool.query(
        `SELECT sg.title, sg.description, c.name AS category_name
         FROM service_gigs sg LEFT JOIN categories c ON sg.category_id = c.id
         WHERE sg.id = $1`, [gigId]);
    if (!r.rows[0]) return;
    const values = await embedText(gigToText(r.rows[0]));
    await pool.query('UPDATE service_gigs SET embedding = $1 WHERE id = $2',
        [toVectorLiteral(values), gigId]);
}

/** Compute + store the embedding for one job posting. */
async function updateJobEmbedding(jobId) {
    const r = await pool.query(
        `SELECT jp.title, jp.description, jp.event_type, jp.event_location,
                jp.special_requirements, c.name AS category_name
         FROM job_postings jp LEFT JOIN categories c ON jp.category_id = c.id
         WHERE jp.id = $1`, [jobId]);
    if (!r.rows[0]) return;
    const values = await embedText(jobToText(r.rows[0]));
    await pool.query('UPDATE job_postings SET embedding = $1 WHERE id = $2',
        [toVectorLiteral(values), jobId]);
}

/** Fire-and-forget wrappers for controllers (never throw). */
function embedGigInBackground(gigId) {
    updateGigEmbedding(gigId).catch(err =>
        console.warn('[embeddingService] gig embed failed:', err.message));
}
function embedJobInBackground(jobId) {
    updateJobEmbedding(jobId).catch(err =>
        console.warn('[embeddingService] job embed failed:', err.message));
}

module.exports = {
    embedText,
    updateGigEmbedding,
    updateJobEmbedding,
    embedGigInBackground,
    embedJobInBackground,
};

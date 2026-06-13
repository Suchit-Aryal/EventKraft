// ============================================================
// AI Controller — EventKraft assistant chat endpoint
// ============================================================

const pool = require('../config/db');
const aiService = require('../utils/aiService');

const MAX_MESSAGES = 12;
const MAX_CONTENT_LENGTH = 2000;
const CATALOG_SIZE = 40;

// Build the gig catalog block injected into the system prompt
async function fetchCatalog() {
    const result = await pool.query(
        `SELECT sg.id, sg.title, sg.starting_price, sg.delivery_time,
                c.name AS category, p.avg_rating
         FROM service_gigs sg
         LEFT JOIN categories c ON sg.category_id = c.id
         LEFT JOIN profiles p ON sg.worker_id = p.user_id
         WHERE sg.status = 'active'
         ORDER BY p.avg_rating DESC NULLS LAST, sg.view_count DESC
         LIMIT $1`,
        [CATALOG_SIZE]
    );
    return result.rows
        .map(g => `id=${g.id} | ${g.title} | category: ${g.category || 'General'} | from NPR ${Number(g.starting_price).toLocaleString()} | delivery: ${g.delivery_time || 'n/a'} days | rating: ${g.avg_rating ? Number(g.avg_rating).toFixed(1) : 'new'}`)
        .join('\n');
}

function buildSystemPrompt(user, catalog) {
    return `You are the EventKraft Assistant, a friendly helper on EventKraft — Nepal's premium event-services marketplace where customers book event services (gigs) from skilled workers (photographers, caterers, decorators, musicians, makeup artists, etc.). Prices are in NPR (Nepalese Rupees).

You are talking to ${user.first_name || 'a user'}, who is a ${user.role} on the platform.

Rules:
- Be concise and helpful. Answer in plain text (no markdown headings or bullets-heavy formatting; short paragraphs are fine).
- When the user asks for service suggestions (e.g. mentions a budget, event type, or asks what to book), recommend 1-3 specific services from the catalog below that genuinely fit. Reference each recommended service by writing the token [[gig:ID]] on its own at the point of mention, e.g. "The Royal Wedding Photography package fits your budget [[gig:12]]".
- Only use [[gig:ID]] tokens with IDs that exist in the catalog. Never invent IDs.
- If nothing in the catalog fits, say so honestly and suggest browsing /gigs.
- Workers may ask about improving their gigs or finding jobs — give practical advice; job listings are at /jobs.
- Stay on the topic of EventKraft and event planning. Politely decline unrelated requests.

CATALOG OF ACTIVE SERVICES:
${catalog}`;
}

exports.chat = async (req, res) => {
    try {
        const { messages } = req.body || {};

        // Validate payload
        if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
            return res.status(400).json({ error: 'Invalid messages payload.' });
        }
        for (const m of messages) {
            if (!m || (m.role !== 'user' && m.role !== 'assistant')
                || typeof m.content !== 'string' || m.content.length === 0
                || m.content.length > MAX_CONTENT_LENGTH) {
                return res.status(400).json({ error: 'Invalid message format.' });
            }
        }
        if (messages[messages.length - 1].role !== 'user') {
            return res.status(400).json({ error: 'Last message must be from the user.' });
        }

        const catalog = await fetchCatalog();
        const systemPrompt = buildSystemPrompt(req.user, catalog);

        const { text, provider } = await aiService.chat(
            systemPrompt,
            messages.map(m => ({ role: m.role, content: m.content }))
        );

        // Resolve [[gig:ID]] tokens into gig card data (gig ids are UUIDs)
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const ids = [...new Set([...text.matchAll(/\[\[gig:([0-9a-fA-F-]+)\]\]/g)].map(m => m[1]))]
            .filter(id => UUID_RE.test(id));
        const cleanText = text.replace(/\s*\[\[gig:[0-9a-fA-F-]+\]\]/g, '').trim();

        let gigs = [];
        if (ids.length > 0) {
            const gigResult = await pool.query(
                `SELECT sg.id, sg.title, sg.starting_price, sg.portfolio_images,
                        c.name AS category_name,
                        p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                        p.avg_rating AS worker_rating
                 FROM service_gigs sg
                 LEFT JOIN categories c ON sg.category_id = c.id
                 LEFT JOIN profiles p ON sg.worker_id = p.user_id
                 WHERE sg.id = ANY($1::uuid[]) AND sg.status = 'active'`,
                [ids]
            );
            gigs = gigResult.rows.map(g => {
                let image = null;
                try {
                    const imgs = typeof g.portfolio_images === 'string'
                        ? JSON.parse(g.portfolio_images) : g.portfolio_images;
                    image = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null;
                } catch (e) { /* leave image null */ }
                return {
                    id: g.id,
                    title: g.title,
                    price: Number(g.starting_price),
                    category: g.category_name,
                    worker: [g.worker_first_name, g.worker_last_name].filter(Boolean).join(' '),
                    rating: g.worker_rating ? Number(g.worker_rating) : null,
                    image,
                    url: `/gigs/${g.id}`,
                };
            });
        }

        res.json({ text: cleanText, gigs, provider });
    } catch (err) {
        console.error('AI chat error:', err.message);
        res.status(503).json({ error: 'AI assistant is unavailable right now. Please try again later.' });
    }
};

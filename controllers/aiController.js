// ============================================================
// AI Controller — EventKraft assistant chat endpoint
// ============================================================

const pool = require('../config/db');
const aiService = require('../utils/aiService');
const { buildExtractionPrompt, validateFields, parseModelJson, EVENT_TYPES } = require('../utils/postingAssistant');

const MAX_MESSAGES = 12;
const MAX_CONTENT_LENGTH = 2000;
const CATALOG_SIZE = 40;

async function fetchCategories() {
    const result = await pool.query('SELECT id, name FROM categories WHERE is_active = true ORDER BY sort_order');
    return result.rows;
}

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

function buildSystemPrompt(user, catalog, categoryNames) {
    return `You are the EventKraft Assistant, a friendly helper on EventKraft — Nepal's premium event-services marketplace where customers book event services (gigs) from skilled workers (photographers, caterers, decorators, musicians, makeup artists, etc.). Prices are in NPR (Nepalese Rupees).

You are talking to ${user.first_name || 'a user'}, who is a ${user.role} on the platform.

Rules:
- Be concise and helpful. Answer in plain text (no markdown headings or bullets-heavy formatting; short paragraphs are fine).
- When the user asks for service suggestions (e.g. mentions a budget, event type, or asks what to book), recommend 1-3 specific services from the catalog below that genuinely fit. Reference each recommended service by writing the token [[gig:ID]] on its own at the point of mention, e.g. "The Royal Wedding Photography package fits your budget [[gig:12]]".
- Only use [[gig:ID]] tokens with IDs that exist in the catalog. Never invent IDs.
- If nothing in the catalog fits, say so honestly and suggest browsing /gigs.
- Workers may ask about improving their gigs or finding jobs — give practical advice; job listings are at /jobs.
- Stay on the topic of EventKraft and event planning. Politely decline unrelated requests.

POSTING A GIG OR SERVICE FROM CHAT:
Today is ${new Date().toISOString().split('T')[0]}.
- If a CUSTOMER says they want to post a gig/job (e.g. "I want to post a gig for my wedding"), collect these required fields conversationally: category (one of: ${categoryNames}), event_type (one of: ${EVENT_TYPES.join(', ')}), a 2+ sentence description, event_date (YYYY-MM-DD, must be in the future — resolve relative dates against today and confirm them), event_location (a Nepali district like Kathmandu, Lalitpur, Kaski), budget_min and budget_max in NPR (min 500, min <= max). Optional: venue, proposal_deadline (before the event date), special_requirements.
- If a WORKER wants to post a service, collect: title (10-100 chars), category, a 2+ sentence description, starting_price (NPR, >= 100). Optional: delivery_time.
- If the user gives invalid info (past date, impossible date, budget min > max, unknown category/district), tell them exactly what is wrong and ask them to correct it. Never accept invalid values.
- Ask for missing fields in short friendly questions (2-3 fields at a time max).
- Once EVERY required field is collected and valid, write a one-line summary and put this token on its own line at the end of your reply (raw JSON, no markdown fence):
[[draft:job:{"category":"...","event_type":"...","description":"...","event_date":"YYYY-MM-DD","event_location":"...","budget_min":0,"budget_max":0}]]
or for a worker service:
[[draft:gig:{"title":"...","category":"...","description":"...","starting_price":0}]]
Include the optional fields in the JSON when the user provided them. Only emit the token when everything is valid — the user will get a button to review, edit and post the draft.

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
        const categories = await fetchCategories();
        const systemPrompt = buildSystemPrompt(req.user, catalog, categories.map(c => c.name).join(', '));

        const { text, provider } = await aiService.chat(
            systemPrompt,
            messages.map(m => ({ role: m.role, content: m.content }))
        );

        // Resolve [[draft:mode:{json}]] token into a validated posting draft
        let draft = null;
        let draftError = '';
        const draftMatch = text.match(/\[\[draft:(job|gig):({[\s\S]*?})\]\]/);
        if (draftMatch) {
            const mode = draftMatch[1];
            let fields = null;
            try { fields = JSON.parse(draftMatch[2]); } catch (e) { /* malformed — ignore */ }
            if (fields) {
                const { errors, cleaned } = validateFields(mode, fields, categories);
                if (errors.length === 0) {
                    const target = mode === 'job' ? '/jobs/create' : '/gigs/create';
                    draft = {
                        mode,
                        fields: cleaned,
                        url: `${target}#ai=${Buffer.from(JSON.stringify(cleaned)).toString('base64url')}`,
                    };
                } else {
                    draftError = ' Before we can finish: ' + errors.join(' ');
                }
            }
        }

        // Resolve [[gig:ID]] tokens into gig card data (gig ids are UUIDs)
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const ids = [...new Set([...text.matchAll(/\[\[gig:([0-9a-fA-F-]+)\]\]/g)].map(m => m[1]))]
            .filter(id => UUID_RE.test(id));
        const cleanText = (text
            .replace(/\s*\[\[draft:(?:job|gig):{[\s\S]*?}\]\]/g, '')
            .replace(/\s*\[\[gig:[0-9a-fA-F-]+\]\]/g, '')
            .trim()) + draftError;

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

        res.json({ text: cleanText, gigs, draft, provider });
    } catch (err) {
        console.error('AI chat error:', err.message);
        res.status(503).json({ error: 'AI assistant is unavailable right now. Please try again later.' });
    }
};

// POST /api/ai/posting — guided field extraction for the create-form helpers
exports.postingAssistant = async (req, res) => {
    try {
        const { mode, messages } = req.body || {};
        if (mode !== 'job' && mode !== 'gig') {
            return res.status(400).json({ error: 'Invalid mode.' });
        }
        if ((mode === 'job' && req.user.role !== 'customer' && req.user.role !== 'admin')
            || (mode === 'gig' && req.user.role !== 'worker' && req.user.role !== 'admin')) {
            return res.status(403).json({ error: mode === 'job' ? 'Only customers can post gigs.' : 'Only service providers can post services.' });
        }
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

        const categories = await fetchCategories();
        const systemPrompt = buildExtractionPrompt(mode, categories, req.user.first_name);
        const { text } = await aiService.chat(systemPrompt, messages);

        const parsed = parseModelJson(text);
        if (!parsed || typeof parsed.reply !== 'string') {
            // Model broke the JSON contract — surface its text as a plain reply
            return res.json({ reply: String(text).slice(0, 1000), complete: false, fields: null });
        }

        if (parsed.complete) {
            const { errors, cleaned } = validateFields(mode, parsed.fields, categories);
            if (errors.length > 0) {
                return res.json({
                    reply: `${parsed.reply} One more thing before we finish: ${errors.join(' ')}`,
                    complete: false,
                    fields: null,
                });
            }
            return res.json({ reply: parsed.reply, complete: true, fields: cleaned });
        }

        res.json({ reply: parsed.reply, complete: false, fields: null });
    } catch (err) {
        console.error('AI posting assistant error:', err.message);
        res.status(503).json({ error: 'AI assistant is unavailable right now. Please try again later.' });
    }
};

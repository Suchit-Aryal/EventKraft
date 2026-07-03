// ============================================================
// Posting Assistant — shared field definitions, prompts and
// server-side validation for AI-assisted gig/job posting.
// The AI extracts fields from natural language; this module is
// the source of truth that decides whether they are actually
// valid (real future dates, known categories/cities, sane
// budgets) before a draft is offered to the user.
// ============================================================

const NEPAL_CITIES = require('../lib/nepal-cities');

const EVENT_TYPES = ['Wedding', 'Reception', 'Engagement', 'Mehendi', 'Birthday', 'Corporate', 'Other'];

// ─── Field extraction prompts ───────────────────────────────

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function fieldSpec(mode, categories) {
    const categoryNames = categories.map(c => c.name).join(', ');
    if (mode === 'job') {
        return `Required fields for a job (gig) posting:
- category: one of [${categoryNames}]
- event_type: one of [${EVENT_TYPES.join(', ')}]
- description: at least 2 sentences describing the event and what is needed (guest count, style, hours...)
- event_date: YYYY-MM-DD, must be AFTER today (today is ${todayStr()})
- event_location: a Nepali city/district, one of the 77 districts (e.g. Kathmandu, Lalitpur, Pokhara/Kaski...)
- budget_min and budget_max: numbers in NPR, min 500, budget_min <= budget_max
Optional fields:
- venue: specific venue/landmark
- proposal_deadline: YYYY-MM-DD, after today and BEFORE event_date
- special_requirements: anything extra`;
    }
    return `Required fields for a service posting:
- title: a catchy service title, 10-100 characters (e.g. "Cinematic Wedding Videography in 4K")
- category: one of [${categoryNames}]
- description: at least 2 sentences selling the service (what's included, experience, equipment...)
- starting_price: number in NPR, at least 100
Optional fields:
- delivery_time: e.g. "3 days"`;
}

function buildExtractionPrompt(mode, categories, userName) {
    return `You are the EventKraft posting assistant helping ${userName || 'a user'} ${mode === 'job'
        ? 'post a gig (a job request where event service providers send proposals)'
        : 'post a service they offer to event customers'} on EventKraft, Nepal's event-services marketplace. Prices are NPR. Today is ${todayStr()}.

${fieldSpec(mode, categories)}

Your job each turn:
1. Read the whole conversation and extract every field the user has provided so far.
2. If the user gave INVALID info (a past or impossible date, budget_min > budget_max, an unknown category or city, a price below the minimum), do NOT silently fix it — tell them exactly what is wrong and ask them to correct it.
3. If required fields are missing, ask for the missing ones (you may ask for 2-3 related fields together, keep it short and friendly).
4. Resolve relative dates ("next Saturday", "in two months") to YYYY-MM-DD using today's date. Confirm the resolved date in your reply.
5. You may write the description yourself based on what the user told you — make it specific, not generic filler.

Respond with ONLY a JSON object, no markdown fences, in this exact shape:
{"reply": "<what you say to the user>", "complete": <true only when ALL required fields are collected and valid>, "fields": {<every field collected so far, omit unknown ones>}}`;
}

// ─── Server-side validation ─────────────────────────────────

function matchCategory(name, categories) {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    return categories.find(c => c.name.toLowerCase() === n)
        || categories.find(c => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()))
        || null;
}

function matchCity(name) {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    return NEPAL_CITIES.find(c => c.toLowerCase() === n)
        || NEPAL_CITIES.find(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()))
        || null;
}

function parseDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
    const d = new Date(value + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Validate AI-extracted fields. Returns { errors: string[], cleaned: object }.
 * `cleaned` maps directly onto the create-form field names.
 */
function validateFields(mode, fields, categories) {
    const errors = [];
    const cleaned = {};
    const f = fields || {};
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const category = matchCategory(f.category, categories);
    if (!category) errors.push(`"${f.category || ''}" is not one of our service categories.`);
    else { cleaned.category_id = category.id; cleaned.category_name = category.name; }

    const desc = String(f.description || '').trim();
    if (desc.length < 30) errors.push('The description is too short — a couple of sentences are needed.');
    else cleaned.description = desc;

    if (mode === 'job') {
        const eventType = EVENT_TYPES.find(t => t.toLowerCase() === String(f.event_type || '').trim().toLowerCase());
        if (!eventType) errors.push(`Event type must be one of: ${EVENT_TYPES.join(', ')}.`);
        else cleaned.event_type = eventType;

        const eventDate = parseDate(f.event_date);
        if (!eventDate) errors.push('A valid event date (YYYY-MM-DD) is required.');
        else if (eventDate < today) errors.push(`The event date ${f.event_date} is in the past — it must be a future date.`);
        else cleaned.event_date = f.event_date;

        const city = matchCity(f.event_location);
        if (!city) errors.push(`"${f.event_location || ''}" doesn't match a Nepali district we cover.`);
        else cleaned.event_location = city;

        const bmin = Number(f.budget_min), bmax = Number(f.budget_max);
        if (!Number.isFinite(bmin) || bmin < 500) errors.push('Minimum budget must be a number of at least NPR 500.');
        if (!Number.isFinite(bmax) || bmax < 500) errors.push('Maximum budget must be a number of at least NPR 500.');
        if (Number.isFinite(bmin) && Number.isFinite(bmax)) {
            if (bmin > bmax) errors.push('Minimum budget cannot be greater than maximum budget.');
            else { cleaned.budget_min = bmin; cleaned.budget_max = bmax; }
        }

        if (f.proposal_deadline) {
            const deadline = parseDate(f.proposal_deadline);
            if (!deadline) errors.push('The proposal deadline must be a valid date (YYYY-MM-DD).');
            else if (deadline < today) errors.push('The proposal deadline is in the past.');
            else if (cleaned.event_date && deadline >= parseDate(cleaned.event_date)) {
                errors.push('The proposal deadline must be before the event date.');
            } else cleaned.proposal_deadline = f.proposal_deadline;
        }
        if (f.venue) cleaned.venue = String(f.venue).trim();
        if (f.special_requirements) cleaned.special_requirements = String(f.special_requirements).trim();
    } else {
        const title = String(f.title || '').trim();
        if (title.length < 10 || title.length > 100) errors.push('The service title must be 10-100 characters.');
        else cleaned.title = title;

        const price = Number(f.starting_price);
        if (!Number.isFinite(price) || price < 100) errors.push('Starting price must be a number of at least NPR 100.');
        else cleaned.starting_price = price;

        if (f.delivery_time) cleaned.delivery_time = String(f.delivery_time).trim();
    }

    return { errors, cleaned };
}

/** Parse the model's JSON reply, tolerating markdown fences. */
function parseModelJson(text) {
    let t = String(text || '').trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1].trim();
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try { return JSON.parse(t.slice(start, end + 1)); } catch (e) { return null; }
}

module.exports = { buildExtractionPrompt, validateFields, parseModelJson, EVENT_TYPES };

// ============================================================
// AI Service — provider chain: Gemini (primary) → Grok (xAI)
// Tries each provider in order; moves to the next on rate
// limits, quota errors, or any failure. No SDKs, native fetch.
// ============================================================

const TIMEOUT_MS = 30000;

// Ordered provider chain. Gemini free tier first (flash, then
// the cheaper flash-lite), xAI Grok as the paid last resort.
const PROVIDERS = [
    { type: 'gemini', model: 'gemini-2.5-flash' },
    { type: 'gemini', model: 'gemini-2.5-flash-lite' },
    { type: 'xai', model: 'grok-3-mini' },
];

async function callGemini(model, systemPrompt, messages) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini ${model} HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (!text) throw new Error(`Gemini ${model} returned empty response`);
    return text;
}

async function callXai(model, systemPrompt, messages) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            max_tokens: 1024,
            temperature: 0.7,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`xAI ${model} HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error(`xAI ${model} returned empty response`);
    return text;
}

/**
 * Send a chat to the first available AI provider.
 * @param {string} systemPrompt
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages
 * @returns {Promise<{text: string, provider: string}>}
 */
async function chat(systemPrompt, messages) {
    const errors = [];
    for (const p of PROVIDERS) {
        try {
            const text = p.type === 'gemini'
                ? await callGemini(p.model, systemPrompt, messages)
                : await callXai(p.model, systemPrompt, messages);
            return { text, provider: p.model };
        } catch (err) {
            errors.push(err.message);
            console.warn(`[aiService] ${p.model} failed, trying next provider:`, err.message);
        }
    }
    throw new Error(`All AI providers failed: ${errors.join(' | ')}`);
}

module.exports = { chat };

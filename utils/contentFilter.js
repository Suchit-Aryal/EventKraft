const SLURS_AND_SWEARS = [
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'tranny', 'chink', 'spic',
    'kike', 'coon', 'wetback', 'gook', 'dyke', 'beaner',
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'pussy', 'cunt',
    'whore', 'slut', 'damn', 'piss', 'cock', 'twat', 'wanker', 'bollocks',
    'motherfucker', 'bullshit', 'horseshit', 'dumbass', 'jackass', 'dipshit',
    'bhenchod', 'madarchod', 'chutiya', 'gaand', 'randi', 'sala', 'harami',
    'muji', 'lado', 'puti', 'machikne', 'behen ke laude'
];

const SAFE_WORDS = new Set([
    'cocktail', 'cocktails', 'peacock', 'hancock', 'dickens', 'dicky',
    'pussycat', 'scunthorpe', 'assassin', 'assassination', 'assistant',
    'classic', 'cockatoo', 'cockerel', 'cocking', 'cockpit', 'cockroach',
    'discuss', 'discussed', 'discussing', 'discussion',
    'basement', 'document', 'documented'
]);

function buildSwearPattern(word) {
    const chars = word.split('');
    const pattern = chars.map(ch => {
        const escaped = ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return escaped + '+';
    }).join('[\\s._\\-]*');
    return pattern + '[a-z]*';
}

const swearRegex = new RegExp(
    '(?<![a-zA-Z])(' + SLURS_AND_SWEARS.map(buildSwearPattern).join('|') + ')(?![a-zA-Z])',
    'gi'
);

const nepaliPhoneRegex = /(9\s*[78])\s*([\s\-]?\d){8}/g;

function filterContent(text) {
    if (!text || typeof text !== 'string') return text;

    let filtered = text.replace(swearRegex, (match) => {
        if (SAFE_WORDS.has(match.toLowerCase())) return match;
        return '****';
    });

    filtered = filtered.replace(nepaliPhoneRegex, (match) => {
        const digits = match.replace(/\D/g, '');
        return digits.slice(0, 2) + '********';
    });

    return filtered;
}

module.exports = { filterContent };

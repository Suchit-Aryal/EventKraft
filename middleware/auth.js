// ============================================================
// Auth Middleware — Protect routes
// ============================================================

/**
 * Ensure the user is logged in.
 * Redirects to /auth/login if not authenticated.
 */
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'Please log in to continue');
    res.redirect('/auth/login');
}

/**
 * Ensure the user is NOT logged in (for login/register pages).
 * Redirects to / if already authenticated.
 */
function ensureGuest(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

module.exports = { ensureAuthenticated, ensureGuest };

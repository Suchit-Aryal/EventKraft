// ============================================================
// Role Check Middleware — Restrict by user role
// ============================================================

/**
 * Restrict access to specific roles.
 * Usage: ensureRole('admin') or ensureRole('customer', 'worker')
 *
 * @param  {...string} roles – Allowed roles
 */
function ensureRole(...roles) {
    return (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) {
            return next();
        }
        req.flash('error', 'You do not have permission to access this page');
        res.redirect('/');
    };
}

module.exports = { ensureRole };

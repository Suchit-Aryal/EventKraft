// ============================================================
// Passport.js Configuration — Local Strategy
// ============================================================

const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const pool = require('./db');

function initialize(passport) {

    // Local strategy: authenticate with email + password
    passport.use(new LocalStrategy(
        { usernameField: 'email' },
        async (email, password, done) => {
            try {
                const result = await pool.query(
                    'SELECT * FROM users WHERE email = $1',
                    [email.toLowerCase()]
                );

                if (result.rows.length === 0) {
                    return done(null, false, { message: 'No account with that email' });
                }

                const user = result.rows[0];

                if (!user.is_active) {
                    return done(null, false, { message: 'Account is deactivated' });
                }

                const isMatch = await bcrypt.compare(password, user.password_hash);

                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Incorrect password' });
                }
            } catch (err) {
                return done(err);
            }
        }
    ));

    // Serialize user ID into session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const result = await pool.query(
                'SELECT id, email, role, is_verified, is_active FROM users WHERE id = $1',
                [id]
            );
            done(null, result.rows[0]);
        } catch (err) {
            done(err);
        }
    });
}

module.exports = initialize;

// ============================================================
// Passport.js Configuration — Local + Google OAuth Strategies
// ============================================================

const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const pool = require('./db');

function initialize(passport) {

    // ── Local Strategy ──────────────────────────────────────
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

                // Google-only users have no password
                if (!user.password_hash) {
                    return done(null, false, { message: 'This account uses Google login. Please sign in with Google.' });
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

    // ── Google OAuth Strategy ───────────────────────────────
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user already exists by Google ID
                    let result = await pool.query(
                        'SELECT * FROM users WHERE google_id = $1',
                        [profile.id]
                    );

                    if (result.rows.length > 0) {
                        return done(null, result.rows[0]);
                    }

                    // Check if user exists by email
                    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                    if (email) {
                        result = await pool.query(
                            'SELECT * FROM users WHERE email = $1',
                            [email.toLowerCase()]
                        );

                        if (result.rows.length > 0) {
                            // Link Google ID to existing account
                            await pool.query(
                                'UPDATE users SET google_id = $1, is_verified = true WHERE id = $2',
                                [profile.id, result.rows[0].id]
                            );
                            const updated = await pool.query('SELECT * FROM users WHERE id = $1', [result.rows[0].id]);
                            return done(null, updated.rows[0]);
                        }
                    }

                    // Create new user from Google profile
                    const newUser = await pool.query(
                        `INSERT INTO users (email, google_id, role, is_verified, is_active)
                         VALUES ($1, $2, 'customer', true, true) RETURNING *`,
                        [email ? email.toLowerCase() : `google_${profile.id}@temp.eventkraft`, profile.id]
                    );

                    // Create profile
                    const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
                    const lastName = profile.name?.familyName || '';
                    const avatar = profile.photos?.[0]?.value || null;

                    await pool.query(
                        'INSERT INTO profiles (user_id, first_name, last_name, avatar_url) VALUES ($1, $2, $3, $4)',
                        [newUser.rows[0].id, firstName, lastName, avatar]
                    );

                    return done(null, newUser.rows[0]);
                } catch (err) {
                    return done(err);
                }
            }
        ));
    }

    // Serialize user ID into session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const result = await pool.query(
                'SELECT id, email, role, is_verified, is_active, totp_enabled, google_id FROM users WHERE id = $1',
                [id]
            );
            done(null, result.rows[0]);
        } catch (err) {
            done(err);
        }
    });
}

module.exports = initialize;

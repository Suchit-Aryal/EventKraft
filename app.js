// ============================================================
// EventKraft — Main Entry Point
// ============================================================

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('express-flash');
const methodOverride = require('method-override');
const passport = require('passport');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import config
const pool = require('./config/db');
const initializePassport = require('./config/passport');

// Import routes
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const gigRoutes = require('./routes/gigRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ─── App Setup ──────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set('io', io);

const PORT = process.env.PORT || 3000;

// ─── View Engine ────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Security Middleware ────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.socket.io"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://*.googleusercontent.com", "https://ui-avatars.com", "https://images.unsplash.com"],
            connectSrc: ["'self'", "ws:", "wss:"],
            // eSewa payment is a cross-origin form POST; without this Helmet's
            // default `form-action 'self'` silently blocks the redirect to eSewa.
            formAction: ["'self'", "https://rc-epay.esewa.com.np", "https://epay.esewa.com.np"],
        },
    },
}));
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
    credentials: true,
}));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ─── Middleware ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session
const sessionMiddleware = session({
    store: new pgSession({ pool, tableName: 'session' }),
    secret: process.env.SESSION_SECRET || 'eventkraft-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
});
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

// Flash messages
app.use(flash());

// Passport authentication
initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// Global variables for templates
app.use(async (req, res, next) => {
    res.locals.currentUser = req.user || null;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Dashboard nav data (icons, unread counts, profile completion)
app.use(require('./middleware/injectNavData'));

// Force incomplete profiles (e.g. Google OAuth signups) through onboarding
app.use((req, res, next) => {
    if (req.isAuthenticated() && req.user.profile_complete === false
        && !req.path.startsWith('/onboarding')
        && !req.path.startsWith('/auth')) {
        return res.redirect('/onboarding/step1');
    }
    next();
});

// ─── Routes ─────────────────────────────────────────────────

// Home page
app.get('/', async (req, res) => {
    try {
        const catResult = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order LIMIT 8');
        const gigResult = await pool.query(
            `SELECT sg.*, c.name AS category_name,
                    p.first_name AS worker_first_name, p.last_name AS worker_last_name,
                    p.avatar_url AS worker_avatar, p.avg_rating AS worker_rating
             FROM service_gigs sg
             LEFT JOIN categories c ON sg.category_id = c.id
             LEFT JOIN profiles p ON sg.worker_id = p.user_id
             WHERE sg.status = 'active'
             ORDER BY p.avg_rating DESC NULLS LAST LIMIT 8`
        );
        res.render('pages/home', {
            title: 'EventKraft — Where Premium Talent Meets Grand Events',
            topbar: req.user ? 'dashboard' : undefined,
            showBrowse: true,
            categories: catResult.rows,
            featuredGigs: gigResult.rows
        });
    } catch (err) {
        console.error('Home page error:', err);
        res.render('pages/home', { title: 'EventKraft', topbar: req.user ? 'dashboard' : undefined, showBrowse: true, categories: [], featuredGigs: [] });
    }
});

// Mount route modules
app.use('/auth', authLimiter, authRoutes);
app.use('/jobs', jobRoutes);
app.use('/gigs', gigRoutes);
app.use('/bookings', bookingRoutes);
app.use('/reviews', reviewRoutes);
app.use('/messages', messageRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', require('./routes/profileRoutes'));
app.use('/onboarding', require('./routes/onboardingRoutes'));
app.use('/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Full-page AI assistant
app.get('/assistant', require('./middleware/auth').ensureAuthenticated, (req, res) => {
    res.render('pages/ai-assistant', { title: 'AI Assistant — EventKraft' });
});

// ─── Socket.io (Real-time Chat & Notifications) ────────────
io.on('connection', (socket) => {
    // Join a personal room for real-time badges/notifications
    socket.on('join-user', (userId) => {
        const sessionUser = socket.request.session && socket.request.session.passport && socket.request.session.passport.user;
        if (sessionUser && String(sessionUser) !== String(userId)) return;
        socket.data.userId = userId;
        socket.join(`user_${userId}`);
    });

    socket.on('join-conversation', async (conversationId) => {
        try {
            const sessionUser = socket.request.session?.passport?.user;
            if (!sessionUser || !conversationId) return;
            const result = await pool.query(
                'SELECT 1 FROM conversations WHERE id = $1 AND (participant_1 = $2 OR participant_2 = $2)',
                [conversationId, sessionUser]
            );
            if (result.rows.length > 0) {
                socket.join(`conversation_${conversationId}`);
            }
        } catch (err) {
            // Invalid UUID or DB error — silently refuse to join
        }
    });

    socket.on('send-message', (data) => {
        // Emit to conversation room for the chat window
        socket.to(`conversation_${data.conversationId}`).emit('new-message', data);
        
        // Also emit to the specific receiver's personal room for the navbar badge
        if (data.receiver_id) {
            socket.to(`user_${data.receiver_id}`).emit('new-message-badge', data);
        }
    });

    socket.on('message-unsent', (data) => {
        socket.to(`conversation_${data.conversationId}`).emit('message-unsent', {
            messageId: data.messageId
        });
    });

    // Booking decisions must go through the authenticated HTTP route.
    // Socket user ids are client-provided in this app, so they are not trusted for writes.
    socket.on('booking_decision', async ({ booking_id, decision }) => {
        socket.emit('booking_decision_error', {
            booking_id,
            decision,
            message: 'Please refresh and try again.',
        });
    });

    socket.on('disconnect', () => {});
});

// ─── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// ─── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/error', { title: 'Server Error', error: err });
});

// ─── Start Server ───────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`✨ EventKraft running on http://localhost:${PORT}`);
});

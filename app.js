// ============================================================
// EventKraft — Main Entry Point
// ============================================================

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('express-flash');
const methodOverride = require('method-override');
const passport = require('passport');
const http = require('http');
const { Server } = require('socket.io');

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

// ─── Middleware ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'eventkraft-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

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
            categories: catResult.rows,
            featuredGigs: gigResult.rows
        });
    } catch (err) {
        console.error('Home page error:', err);
        res.render('pages/home', { title: 'EventKraft', categories: [], featuredGigs: [] });
    }
});

// Mount route modules
app.use('/auth', authRoutes);
app.use('/jobs', jobRoutes);
app.use('/gigs', gigRoutes);
app.use('/bookings', bookingRoutes);
app.use('/reviews', reviewRoutes);
app.use('/messages', messageRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', require('./routes/profileRoutes'));
app.use('/onboarding', require('./routes/onboardingRoutes'));
app.use('/dashboard', require('./routes/dashboardRoutes'));

// ─── Socket.io (Real-time Chat & Notifications) ────────────
io.on('connection', (socket) => {
    // Join a personal room for real-time badges/notifications
    socket.on('join-user', (userId) => {
        socket.data.userId = userId;
        socket.join(`user_${userId}`);
    });

    socket.on('join-conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
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

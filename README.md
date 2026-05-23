# EventKraft

> **Where Premium Talent Meets Grand Events**

Nepal's first marketplace for premium event professionals — photographers, videographers, decorators, and more.

---

## Tech Stack

| Layer          | Technology                  |
| -------------- | --------------------------- |
| Frontend       | EJS Templates + Bootstrap 5 |
| Backend        | Node.js + Express.js        |
| Database       | PostgreSQL                  |
| Auth           | Passport.js (session-based) |
| File Uploads   | Multer + Cloudinary         |
| Real-time Chat | Socket.io                   |
| Notifications  | Socket.io + In-app badge system |
| Theming        | CSS Variables + Dark/Light toggle |

## Folder Structure

```
project/
├── app.js                          # Express entry point + Socket.io
├── package.json
├── .env.example                    # Environment variable template
├── .gitignore
│
├── config/
│   ├── db.js                       # PostgreSQL connection pool
│   ├── passport.js                 # Passport.js local strategy
│   └── cloudinary.js               # Cloudinary image upload config
│
├── middleware/
│   ├── auth.js                     # ensureAuthenticated / ensureGuest
│   ├── roleCheck.js                # ensureRole (customer/worker/admin)
│   ├── requireProfileReady.js      # blocks incomplete worker profiles
│   └── injectNavData.js            # injects unread counts into res.locals
│
├── models/                         # 14 model files — full CRUD + relational JOINs
│   ├── index.js                    # Barrel export for all models
│   ├── User.js                     # create, find, search, updatePassword, stats
│   ├── Profile.js                  # avatar, bio, rating calc, verification
│   ├── Category.js                 # categories + subcategories + counts
│   ├── Job.js                      # job postings with search/filter
│   ├── Proposal.js                 # proposals with accept (auto-decline others)
│   ├── Gig.js                      # service gigs with search/sort
│   ├── GigPackage.js               # basic / standard / premium tiers
│   ├── Booking.js                  # bookings with multi-table JOINs
│   ├── Review.js                   # reviews with auto-rating recalculation
│   ├── Message.js                  # conversations + messages + unread counts
│   ├── Transaction.js              # payments, earnings, platform revenue
│   ├── Notification.js             # in-app notifications
│   ├── Dispute.js                  # disputes with auto-booking status update
│   └── CommissionSetting.js        # tiered commission rate calculation
│
├── controllers/
│   ├── authController.js           # login, register, logout, 2FA, settings redirect
│   ├── jobController.js            # CRUD for job postings
│   ├── gigController.js            # CRUD for service gigs
│   ├── bookingController.js        # booking management
│   ├── reviewController.js         # submit + view reviews
│   ├── messageController.js        # conversations + chat
│   ├── profileController.js        # profile CRUD, KYC upload, public profile
│   └── adminController.js          # dashboard stats, users, KYC, disputes, commissions
│
├── routes/
│   ├── authRoutes.js
│   ├── jobRoutes.js
│   ├── gigRoutes.js
│   ├── bookingRoutes.js
│   ├── reviewRoutes.js
│   ├── messageRoutes.js
│   ├── profileRoutes.js            # public profile + dashboard profile routes
│   ├── dashboardRoutes.js          # unified dashboard (overview, profile, KYC, settings, notifications)
│   └── adminRoutes.js
│
├── views/
│   ├── partials/
│   │   ├── header.ejs              # public layout header
│   │   ├── tail.ejs                # public layout footer
│   │   ├── navbar.ejs              # public navbar
│   │   ├── footer.ejs              # public footer
│   │   ├── topnav.ejs              # dashboard top navigation
│   │   ├── sidebar.ejs             # dashboard sidebar navigation
│   │   ├── dashboard-wrapper-start.ejs   # dashboard layout opener
│   │   └── dashboard-wrapper-end.ejs     # dashboard layout closer
│   ├── layouts/
│   │   └── dashboard-layout.ejs    # legacy dashboard layout (deprecated)
│   └── pages/                      # all page templates
│       ├── home.ejs
│       ├── login.ejs / register.ejs
│       ├── gigs.ejs / gig-detail.ejs / gig-create.ejs
│       ├── jobs.ejs / job-detail.ejs / job-create.ejs
│       ├── bookings.ejs / booking-detail.ejs
│       ├── messages.ejs / conversation.ejs
│       ├── dashboard-overview.ejs
│       ├── dashboard-profile.ejs
│       ├── dashboard-settings.ejs
│       ├── dashboard-kyc.ejs
│       ├── dashboard-notifications.ejs
│       ├── setup-2fa.ejs / verify-2fa.ejs
│       ├── public-profile.ejs
│       ├── admin-dashboard.ejs / admin-bookings.ejs
│       ├── admin-users.ejs / admin-disputes.ejs
│       ├── admin-commissions.ejs / admin-kyc-list.ejs
│       ├── 404.ejs / error.ejs
│       └── onboarding.ejs
│
├── public/
│   ├── css/
│   │   ├── style.css               # base styles + CSS variables + public pages
│   │   ├── topnav.css              # dashboard topnav styles
│   │   ├── sidebar.css             # dashboard sidebar styles
│   │   ├── forms.css               # form, upload, KYC, tab styles
│   │   ├── cards.css               # gig/job cards + badges
│   │   └── chat.css                # messaging/conversation styles
│   ├── js/
│   │   ├── main.js                 # client-side JS + theme toggle
│   │   ├── chat.js                 # real-time chat handler
│   │   └── realtime-badges.js     # notification badge updater
│   └── images/
│
└── database/
    ├── schema.sql                  # PostgreSQL schema (15 tables, 9 enums, 16 indexes)
    ├── setup.js                    # Creates tables + admin account + commission tiers
    ├── seed.js                     # Sample Nepali data (users, gigs, jobs, bookings)
    └── reset.js                    # Drops everything and recreates from scratch
```

## Getting Started

### 1. Install dependencies

```bash
cd project
npm install
```

### 2. Setup PostgreSQL

**Option A — Using pgAdmin4 (Recommended):**

1. Open pgAdmin4 and connect to your server
2. Open the Query Tool on your target database
3. Open and run `database/schema.sql` — this creates all 15 tables, enums, indexes, and seed categories

**Option B — Using terminal (if peer auth is configured):**

```bash
sudo -u postgres psql -c "CREATE DATABASE eventkraft;"
sudo -u postgres psql -d eventkraft -f database/schema.sql
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials and Cloudinary keys:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE_NAME
SESSION_SECRET=any_random_string_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Run the server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Scripts

| Command            | What It Does                                                          |
| ------------------ | --------------------------------------------------------------------- |
| `npm run db:setup` | Runs schema.sql + creates admin account + seeds commission tiers      |
| `npm run db:seed`  | Populates sample data (3 customers, 4 workers, gigs, jobs, bookings) |
| `npm run db:reset` | ⚠️ Drops ALL tables and recreates from scratch                        |

### Sample Logins (after running seed)

| Role     | Email                     | Password    |
| -------- | ------------------------- | ----------- |
| Admin    | admin@eventkraft.com      | admin123    |
| Customer | aarav.sharma@gmail.com    | password123 |
| Customer | sita.thapa@gmail.com      | password123 |
| Worker   | ram.photography@gmail.com | password123 |
| Worker   | priya.decor@gmail.com     | password123 |

## Database Schema Overview

**15 Tables** connected through relational foreign keys:

```
users ──┬── profiles (1:1)
        ├── job_postings (1:N) ──── proposals (1:N)
        ├── service_gigs (1:N) ──── gig_packages (1:N)
        ├── bookings (N:N via customer_id / worker_id)
        │     ├── reviews (1:N)
        │     ├── transactions (1:N)
        │     └── disputes (1:N)
        ├── conversations (N:N) ──── messages (1:N)
        └── notifications (1:N)

categories (self-referencing parent_id)
commission_settings (admin-managed)
```

## Models — CRUD Operations

Each model connects to the PostgreSQL tables via `pg` connection pool and provides:

| Operation  | What It Does                                                                               |
| ---------- | ------------------------------------------------------------------------------------------ |
| **CREATE** | `INSERT INTO` with parameterized queries                                                   |
| **READ**   | `SELECT` with `JOIN` across related tables (e.g., booking → customer + worker + gig + job) |
| **UPDATE** | `COALESCE`-based partial updates (only changes specified fields)                           |
| **DELETE** | Hard delete + soft delete options                                                          |
| **SEARCH** | Dynamic `WHERE` clauses with `ILIKE` for text search (title, description, and provider/customer name) |
| **STATS**  | Aggregation queries (`COUNT`, `SUM`, `AVG`, `FILTER`) for dashboards                       |

## User Roles

| Role         | Navigation                        | Access                                                  |
| ------------ | --------------------------------- | ------------------------------------------------------- |
| **Customer** | Browse Services · Post a Job      | Post jobs, browse services, book workers, leave reviews |
| **Worker**   | Browse Jobs · Create Service      | Create service gigs, submit proposals, manage bookings  |
| **Admin**    | Browse Services · Browse Jobs     | Manage users, resolve disputes, configure commissions, KYC verification |
| **Guest**    | Browse Services · Browse Jobs     | View listings, register to interact                     |

## Key Features

### Dashboard System
- Unified dashboard with **sidebar + topnav** layout for all authenticated pages
- Conditional layout: public header/footer for guests, dashboard layout for logged-in users
- Responsive design with mobile-friendly sidebar toggle
- Active page highlighting in sidebar

### Profile & KYC
- Full profile management (avatar, cover, bio, skills, social links)
- **KYC/Identity Verification** with document upload (passport, citizenship, license)
- Admin KYC approval workflow
- Public profile page with active gigs listing
- **Portfolio Gallery** for workers to showcase their best work

### Real-time Features
- **Socket.io-powered messaging** with read receipts
- **In-app notifications** with real-time badge updates
- Notification center page with mark-as-read
- **Message Reply & Unsend** functionality
- **File attachments** in chat (Images, PDFs)

### Authentication & Security
- Passport.js session-based auth
- **2FA/TOTP support** via speakeasy (Google Authenticator)
- Role-based access control (customer / worker / admin)
- Profile completion enforcement for workers
- Account deactivation & deletion

### Browse & Discovery
- Services (Gigs) browsing with category, price, keyword filters
- Jobs browsing with search and sort
- Public gig/job detail pages

### Bookings & Reviews
- Booking lifecycle (pending → confirmed → completed → reviewed)
- Review submission with auto-rating recalculation
- Dispute filing and admin resolution

### Admin Panel
- Dashboard statistics and charts
- User management
- Booking management
- KYC verification queue
- Dispute resolution
- Commission settings

### Theming
- **Light/Dark mode toggle** with sun/moon icon in topnav
- CSS custom properties for consistent theming
- Persistent theme preference via `localStorage`

---

## Changelog

### 2026-05-16 — Documentation: Blueprint & Schema Sync

**Branch:** `docs/blueprint-sync`

- Synchronized `EventKraft-Blueprint` (MD, JSON, and SQL) with the current project implementation.
- Updated `README.md` to reflect latest features: **KYC Verification**, **2FA Security**, and **Advanced Chat (Reply/Unsend)**.
- Documented 2 new database tables (`kyc_submissions`, `portfolio_items`) and updated schema specifications to match PostgreSQL reality (17 tables total).
- Moved implemented suggestions (Video Portfolios, Comparison View, Badges) to the completed section in blueprints.

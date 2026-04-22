# EventKraft

> **Where Premium Talent Meets Grand Events**

Nepal's first marketplace for premium event professionals — photographers, videographers, decorators, and more.

---

Then

## Tech Stack

| Layer          | Technology                  |
| -------------- | --------------------------- |
| Frontend       | EJS Templates + Bootstrap 5 |
| Backend        | Node.js + Express.js        |
| Database       | PostgreSQL                  |
| Auth           | Passport.js (session-based) |
| File Uploads   | Multer + Cloudinary         |
| Real-time Chat | Socket.io                   |

-Sucdurshanchanges

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
│   └── roleCheck.js                # ensureRole (customer/worker/admin)
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
│   ├── authController.js           # login, register, logout, dashboard redirect
│   ├── jobController.js            # CRUD for job postings
│   ├── gigController.js            # CRUD for service gigs
│   ├── bookingController.js        # booking management
│   ├── reviewController.js         # submit + view reviews
│   ├── messageController.js        # conversations + chat
│   └── adminController.js          # dashboard stats, users, disputes, commissions
│
├── routes/
│   ├── authRoutes.js
│   ├── jobRoutes.js
│   ├── gigRoutes.js
│   ├── bookingRoutes.js
│   ├── reviewRoutes.js
│   ├── messageRoutes.js
│   └── adminRoutes.js
│
├── views/
│   ├── partials/                   # header, tail, navbar, footer
│   └── pages/                      # home, login, register, dashboards (×3),
│                                   # jobs, gigs, bookings, messages, 404, error
│
├── public/
│   ├── css/style.css               # Custom CSS on top of Bootstrap 5
│   ├── js/main.js                  # Client-side JS
│   └── images/
│
└── database/
    ├── schema.sql                  # PostgreSQL schema (15 tables, 9 enums, 16 indexes)
    ├── setup.js                    # Creates tables + admin account + commission tiers
    ├── seed.js                     # Sample Nepali data (users, gigs, jobs, bookings)
    └── reset.js                    # Drops everything and recreates from scratch
```

## 🚀 Team Setup (after `git clone`)

> **Every teammate follows these steps on their own machine.**
> The database is hosted on **Supabase** (cloud PostgreSQL) — everyone shares the same data.

### 1. Install dependencies

```bash
cd project
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Get the **Supabase connection string** from your team lead and paste it as the `DATABASE_URL` in `.env`.

### 3. Run the server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Scripts

| Command            | What It Does                                                           |
| ------------------ | ---------------------------------------------------------------------- |
| `npm run db:init`  | 🆕 Runs setup + seed in one command (recommended for first-time setup) |
| `npm run db:setup` | Runs schema.sql + creates admin account + seeds commission tiers       |
| `npm run db:seed`  | Populates sample data (3 customers, 4 workers, gigs, jobs, proposals)  |
| `npm run db:reset` | ⚠️ Drops ALL tables and recreates from scratch                         |

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
| **SEARCH** | Dynamic `WHERE` clauses with `ILIKE` for text search                                       |
| **STATS**  | Aggregation queries (`COUNT`, `SUM`, `AVG`, `FILTER`) for dashboards                       |

## User Roles

| Role         | Access                                                  |
| ------------ | ------------------------------------------------------- |
| **Customer** | Post jobs, browse services, book workers, leave reviews |
| **Worker**   | Create service gigs, submit proposals, manage bookings  |
| **Admin**    | Manage users, resolve disputes, configure commissions   |

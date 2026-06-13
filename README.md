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
    ├── schema.sql                  # PostgreSQL schema (18 tables, 9 enums, indexes)
    ├── migrations/                 # Incremental migrations (001–008), applied by setup.js
    ├── setup.js                    # Creates tables + applies migrations + admin + commission tiers
    ├── seed.js                     # Rich demo data (users, gigs, jobs, bookings, reviews, chat)
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
3. Open and run `database/schema.sql` — this creates all 18 tables, enums, indexes, and seed categories

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

| Command            | What It Does                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `npm run db:setup` | Runs schema.sql + applies `database/migrations/` in order + creates admin + commission tiers |
| `npm run db:seed`  | Populates the full demo dataset (see **Test / Demo Data** below)                              |
| `npm run db:init`  | `db:setup` followed by `db:seed` — one command for a fresh, fully populated database          |
| `npm run db:reset` | ⚠️ Drops ALL tables and recreates from scratch                                                |

## Test / Demo Data

Run `npm run db:setup` then `npm run db:seed` (or just `npm run db:init`). All demo
accounts use the password **`password123`** (admin uses **`admin123`**). Gig portfolio
photos are real Unsplash images (`images.unsplash.com` is whitelisted in the CSP) and
avatars are generated by `ui-avatars.com`.

### Accounts

| Role     | Email                       | Password    | City      | What this account has                                              |
| -------- | --------------------------- | ----------- | --------- | ------------------------------------------------------------------ |
| Admin    | admin@eventkraft.com        | admin123    | —         | Full admin panel access                                            |
| Customer | aarav.sharma@gmail.com      | password123 | Kathmandu | 1 job posting (2 proposals), accepted + completed bookings, chat with Ram |
| Customer | sita.thapa@gmail.com        | password123 | Pokhara   | 1 job posting (1 proposal), paid-advance + completed bookings, 1 review written |
| Customer | rajan.kc@gmail.com          | password123 | Bhaktapur | 1 job posting, 1 pending booking                                   |
| Worker   | ram.photography@gmail.com   | password123 | Kathmandu | KYC ✅, 1 photography gig, 1 proposal, 1 accepted booking, chat with Aarav |
| Worker   | priya.decor@gmail.com       | password123 | Lalitpur  | KYC ✅, 2 gigs (decoration + catering), 1 proposal, 1 paid-advance booking |
| Worker   | bikash.video@gmail.com      | password123 | Kathmandu | KYC ✅, 2 gigs (videography + DJ), 1 proposal, pending + completed bookings, reviews |
| Worker   | anita.mehendi@gmail.com     | password123 | Pokhara   | KYC ✅, 1 mehendi gig, 1 completed booking, 1 five-star review     |

### Gigs (all active, 3 packages each)

| Gig                                          | Worker | Category    | Starting | Packages (basic / standard / premium) |
| -------------------------------------------- | ------ | ----------- | -------- | -------------------------------------- |
| Premium Wedding Photography                  | Ram    | Photography | 25,000   | 25k / 50k / 100k                        |
| Luxury Wedding Decoration & Mandap Setup     | Priya  | Decoration  | 50,000   | 50k / 120k / 250k                       |
| Cinematic Wedding Videography in 4K          | Bikash | Videography | 35,000   | 35k / 65k / 110k                        |
| Bridal Mehendi — Traditional & Modern        | Anita  | Mehendi     | 5,000    | 5k / 12k / 20k                          |
| Boutique Event Catering                      | Priya  | Catering    | 60,000   | 60k / 120k / 220k                       |
| Wedding & Reception DJ                       | Bikash | Music & DJ  | 15,000   | 15k / 28k / 45k                         |

### Job Postings (published)

| Job                                        | Poster | Budget (NPR)      | Event Date | Proposals |
| ------------------------------------------ | ------ | ----------------- | ---------- | --------- |
| Wedding Photographer for 3-Day Wedding     | Aarav  | 30,000 – 80,000   | 2026-06-15 | 2 (Ram 45k, Bikash 65k) |
| Full Venue Decoration, Lakeside Pokhara    | Sita   | 100,000 – 200,000 | 2026-07-20 | 1 (Priya 150k) |
| Reception DJ for Corporate Anniversary     | Rajan  | 15,000 – 30,000   | 2026-08-10 | 0         |

### Bookings (one per lifecycle stage)

| Status         | Customer → Worker | Service               | Amount (NPR) | Demonstrates                                         |
| -------------- | ----------------- | --------------------- | ------------ | ---------------------------------------------------- |
| `pending`      | Rajan → Bikash    | Reception DJ          | 28,000       | Worker accept/decline flow (chat booking card)       |
| `accepted`     | Aarav → Ram       | Wedding Photography   | 50,000       | Agreement + 30% advance payment flow (24h deadline)  |
| `paid_advance` | Sita → Priya      | Wedding Decoration    | 120,000      | Work-in-progress; worker submits completion proof    |
| `completed`    | Sita → Anita      | Bridal Mehendi        | 12,000       | Full lifecycle with advance + final transactions     |
| `completed`    | Aarav → Bikash    | Wedding Videography   | 65,000       | Full lifecycle, has reviews in both directions       |

### Also seeded

- **Chat:** a 5-message conversation between Aarav and Ram about the photography booking.
- **Notifications:** booking accepted (Aarav), advance received (Priya), KYC approved (Ram).
- **KYC records:** all 4 workers have approved `kyc_submissions` reviewed by the admin, so the admin KYC page shows history and workers can post services immediately.
- **Transactions:** advance (no commission) and final (full commission) eSewa ledger rows for the paid bookings — these power worker earnings and the admin Transactions page.
- **Commission tiers** (from setup): ≤25k → 5%, ≤100k → 7%, ≤300k → 10%, ≤500k → 12%, above → 15%. Advance is 30% of total, final is 70%.
- **Categories:** 10 defaults (Photography, Videography, Painting & Art, Decoration, Makeup & Styling, Music & DJ, Catering, Event Planning, Mehendi, Pandit/Priest).

## Admin Panel

Log in as **admin@eventkraft.com** to access `/admin`. Every page uses the dashboard layout with the Admin sidebar section.

| Page                 | Route                | Capabilities                                                                                  |
| -------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| Overview             | `/admin`             | Platform stats (users, jobs, gigs, revenue, commission, disputes), recent bookings & signups   |
| Users                | `/admin/users`       | Filter by keyword/role/status · toggle verified · activate/deactivate · **change role** · **reset password** · **delete user** |
| Bookings             | `/admin/bookings`    | Filter by status · view amounts & commission · **override any booking status** (full lifecycle list) |
| Services             | `/admin/services`    | Filter/search gigs · pause/activate · **remove listing from marketplace**                       |
| Jobs                 | `/admin/jobs`        | Filter/search job postings · change status (published/closed/draft/cancelled)                  |
| Transactions         | `/admin/transactions`| Revenue stat cards (volume, commission, collected) + ledger of the latest 200 transactions     |
| Categories           | `/admin/categories`  | Create categories (auto-slug) · rename/re-order · hide/show from browse & creation forms       |
| Reviews              | `/admin/reviews`     | Moderate latest 200 reviews · hide/show · delete (reviewee rating auto-recalculates)           |
| KYC Verification     | `/admin/kyc`         | Approve/reject identity documents; approval unlocks service posting for workers                |
| Disputes             | `/admin/disputes`    | Review and resolve booking disputes                                                            |
| Commissions          | `/admin/commissions` | Edit tiered commission rates                                                                   |
| Legal Action         | `/admin/legal-action`| Track overdue final payments, escalate to legal action, mark resolved                          |

**Guard rails:** admins cannot deactivate or delete themselves or other admins, cannot change their own role, cannot modify other admin accounts, and cannot reset another admin's password. Booking status overrides ask for confirmation since they bypass the payment lifecycle.


## Database Schema Overview

**18 Tables** connected through relational foreign keys:

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

### 2026-06-13 — eSewa Test Credentials Fix

**Branch:** `bug-fixes/anuj`

- **Fixed broken eSewa payments:** `ESEWA_MERCHANT_CODE` was `9761800954`, which eSewa's ePay v2 sandbox rejects with `HTTP 400 "Unable to fetch merchant key"` — so both the advance and final payment forms failed. The sandbox requires the official test product code **`EPAYTEST`** (paired with the test secret key already in `.env`). Verified against eSewa's live RC servers: the payment form now returns `302` to the eSewa payment page and the status-verification endpoint recognises the merchant.
- **eSewa test login** (entered on eSewa's own payment page during checkout, not app config): eSewa ID `9711111111`–`9711111114`, password `Nepal@123`, token/OTP `123456` (MPIN `1122` is for the mobile app only). The mobile-SDK `client_id`/`client_secret` are not used — this app uses the ePay v2 redirect (form POST) flow.
- For production, set `ESEWA_ENV=live` and replace the merchant code + secret with real eSewa credentials.

### 2026-06-12 — AI Assistant, Recommendations, Dashboard Upgrades & UI Fixes

**Branch:** `bug-fixes/anuj`

**AI Assistant (new)**
- Floating **EventKraft Assistant** chat widget (bottom-left) on all pages for logged-in users. Ask about budgets, event types, or services and it answers with clickable service cards (image, price, rating) that link to the gig page.
- Provider fallback chain in `utils/aiService.js`: **Gemini 2.5 Flash → Gemini 2.5 Flash-Lite → Grok (xAI)**. If one provider hits a rate limit or fails, the next is tried automatically. Keys: `GEMINI_API_KEY`, `XAI_API_KEY` in `.env`.
- `POST /api/ai/chat` (auth\req/min/user). The live gig catalog is injected into the prompt; the model references gigs via `[[gig:ID]]` tokens which the server resolves into card data. Chat history persists across pages via `sessionStorage`.

**Recommendations (new)**
- `utils/recommendationService.js` — pure SQL, no AI quota used. Customers see a **"Recommended for you"** slider of gigs from categories they've booked before (top-rated first, already-booked gigs excluded, popular gigs as backfill). Workers see **"Jobs you might like"** — published jobs in their gig categories, excluding ones they already proposed to.

**Dashboard**
- Recommendations slider added for both roles (horizontal scroll-snap cards).
- Workers now have a **Recent Orders** box (latest 5 bookings with status and customer name) — previously workers had no order history on the overview.

**UI fixes**
- `.crm-table` used `overflow: hidden`, clipping wide tables — the admin **Manage Users** Actions column was cut off and its buttons unreachable. Tables now scroll horizontally inside the card.
- Mobile topnav overflowed the screen (~154px) on phones: the Dashboard pill hides ≤640px (still in the avatar menu), logo text and avatar chevron hide ≤480px, tighter paddings. Pages no longer scroll sideways at 375px.

### 2026-06-11 — Security Hardening, Bug Fixes, Full Admin Panel & Rich Demo Data

**Branch:** `bug-fixes/anuj`

**Security fixes**
- **Booking price tampering (critical):** `POST /bookings` no longer trusts client-submitted amounts. Price is resolved server-side from the gig/package, commission is computed via `CommissionSetting`, and `worker_id` comes from the gig. Self-booking and inactive gigs are rejected.
- **Booking status escalation:** `PUT /bookings/:id` now enforces a per-role status whitelist — payment statuses are only reachable through the payment flow. Completion requires `in_progress`/`paid_final`; cancellation after money has moved requires a dispute/support; the legacy accept route now sets advance/final amounts and deadlines like the chat accept flow; advance payment success has a replay guard.
- **IDOR fixes:** gig delete/publish and job update/delete/publish now verify ownership.
- **Review integrity:** reviews require a completed booking, an integer 1–5 rating, and one review per booking per user (friendly error instead of a DB crash).
- **Chat eavesdropping:** Socket.io `join-conversation` now verifies the session user is a participant of the conversation before joining the room.
- **Password & role hardening:** onboarding and password change require ≥8 characters; onboarding can never assign the `admin` role; eSewa final-payment URLs no longer break when `APP_URL` is unset and the gateway config is validated up front.

**Bug fixes**
- Added missing `users.verification_token` / `verification_expires` columns (schema + migration 008) — email verification no longer crashes fresh installs.
- `db:setup` now applies `database/migrations/` after the schema, and `schema.sql` was brought to full parity with migrations 001–007 (legal/eSewa/completion booking fields, `booking_agreements` table, `messages.message_type`, unique eSewa indexes — constraint names match so migrations no-op cleanly).
- `db:reset` now also drops `booking_agreements`, `kyc_submissions`, `portfolio_items` and `session`, so reset → setup works.
- Worker earnings and platform revenue now count `advance_payment`/`final_payment` transactions (previously always 0).
- Customer dashboard stats fixed (pending proposals counted bookings; proposal counts on jobs; total spent includes `paid_final`); worker stats now use `worker_earning` and include `paid_final`.
- Contact settings validate email format, detect duplicate emails, and normalise Nepali phone numbers to `+977XXXXXXXXXX`; deactivation message no longer claims you can log back in.
- `Profile.total_completed` is now incremented when bookings complete.

**Admin panel (new)**
- Users: keyword/role/status filters, role change, password reset, permanent delete — with self/other-admin guard rails.
- Bookings: status filter, service titles, full status override.
- New pages: **Transactions** (revenue cards + ledger), **Categories** (create/edit/hide), **Reviews** (hide/show/delete with rating recalc).
- Services: listings can now be removed from the marketplace. Sidebar and dashboard quick links updated.

**Demo data**
- `database/seed.js` completely rewritten: 3 customers, 4 KYC-approved workers (rich bios, skills, taglines), 6 gigs with real Unsplash photos and 3 packages each, 3 job postings with personalised proposals, 5 bookings covering every lifecycle stage with correct commission math and eSewa transaction ledger rows, 3 reviews, a seeded chat conversation and notifications. `images.unsplash.com` added to the CSP image whitelist.

### 2026-05-16 — Documentation: Blueprint & Schema Sync

**Branch:** `docs/blueprint-sync`

- Synchronized `EventKraft-Blueprint` (MD, JSON, and SQL) with the current project implementation.
- Updated `README.md` to reflect latest features: **KYC Verification**, **2FA Security**, and **Advanced Chat (Reply/Unsend)**.
- Documented 2 new database tables (`kyc_submissions`, `portfolio_items`) and updated schema specifications to match PostgreSQL reality (17 tables total).
- Moved implemented suggestions (Video Portfolios, Comparison View, Badges) to the completed section in blueprints.

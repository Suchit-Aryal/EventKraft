-- ============================================================
-- EventKraft Database Schema — PostgreSQL
-- Generated from: 08-database-schema.json
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('customer', 'worker', 'admin');

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

CREATE TYPE job_status AS ENUM (
    'draft', 'published', 'in_progress', 'completed', 'cancelled', 'closed'
);

CREATE TYPE proposal_status AS ENUM (
    'pending', 'shortlisted', 'accepted', 'declined', 'withdrawn'
);

CREATE TYPE gig_status AS ENUM (
    'draft', 'active', 'paused', 'deleted'
);

CREATE TYPE package_tier AS ENUM (
    'basic', 'standard', 'premium'
);

CREATE TYPE booking_status AS ENUM (
    'pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed'
);

CREATE TYPE transaction_type AS ENUM (
    'payment', 'refund', 'payout'
);

CREATE TYPE transaction_status AS ENUM (
    'pending', 'completed', 'failed', 'refunded'
);

CREATE TYPE dispute_status AS ENUM (
    'open', 'under_review', 'resolved', 'dismissed'
);


-- ============================================================
-- 1. USERS — Core user table with authentication and role data
-- ============================================================

CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20)  UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role    NOT NULL,
    is_verified     BOOLEAN      DEFAULT false,
    is_active       BOOLEAN      DEFAULT true,
    created_at      TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW()
);


-- ============================================================
-- 2. PROFILES — Extended user info, one-to-one with users
-- ============================================================

CREATE TABLE profiles (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    avatar_url          TEXT,
    cover_photo_url     TEXT,
    bio                 TEXT,
    city                VARCHAR(100),
    address             TEXT,
    date_of_birth       DATE,
    gender              gender_type,
    social_links        JSONB,
    is_admin_verified   BOOLEAN      DEFAULT false,
    verification_docs   JSONB,
    avg_rating          DECIMAL(3,2) DEFAULT 0.00,
    total_reviews       INTEGER      DEFAULT 0,
    total_completed     INTEGER      DEFAULT 0,
    created_at          TIMESTAMP    DEFAULT NOW(),
    updated_at          TIMESTAMP    DEFAULT NOW()
);


-- ============================================================
-- 3. CATEGORIES — Service categories with optional sub-categories
-- ============================================================

CREATE TABLE categories (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon        VARCHAR(50),
    parent_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,
    is_active   BOOLEAN      DEFAULT true,
    sort_order  INTEGER      DEFAULT 0
);


-- ============================================================
-- 4. JOB_POSTINGS — Customer job posts (Upwork model)
-- ============================================================

CREATE TABLE job_postings (
    id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id          UUID          REFERENCES categories(id) ON DELETE SET NULL,
    title                VARCHAR(255)  NOT NULL,
    description          TEXT          NOT NULL,
    event_type           VARCHAR(100),
    event_date           DATE,
    event_location       VARCHAR(255),
    budget_min           DECIMAL(12,2),
    budget_max           DECIMAL(12,2),
    proposal_deadline    DATE,
    attachments          JSONB,
    special_requirements TEXT,
    status               job_status    DEFAULT 'draft',
    max_proposals        INTEGER       DEFAULT 20,
    selected_worker_id   UUID          REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMP     DEFAULT NOW(),
    updated_at           TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 5. PROPOSALS — Worker proposals on job postings
-- ============================================================

CREATE TABLE proposals (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id              UUID          NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    worker_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter        TEXT          NOT NULL,
    proposed_price      DECIMAL(12,2) NOT NULL,
    estimated_duration  VARCHAR(100),
    portfolio_links     JSONB,
    status              proposal_status DEFAULT 'pending',
    created_at          TIMESTAMP     DEFAULT NOW(),
    updated_at          TIMESTAMP     DEFAULT NOW(),

    UNIQUE (job_id, worker_id)
);


-- ============================================================
-- 6. SERVICE_GIGS — Worker service listings (Fiverr model)
-- ============================================================

CREATE TABLE service_gigs (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id       UUID          REFERENCES categories(id) ON DELETE SET NULL,
    title             VARCHAR(255)  NOT NULL,
    description       TEXT          NOT NULL,
    tags              JSONB,
    portfolio_images  JSONB,
    portfolio_videos  JSONB,
    delivery_time     VARCHAR(100),
    starting_price    DECIMAL(12,2) NOT NULL,
    faq               JSONB,
    status            gig_status    DEFAULT 'draft',
    view_count        INTEGER       DEFAULT 0,
    impression_count  INTEGER       DEFAULT 0,
    created_at        TIMESTAMP     DEFAULT NOW(),
    updated_at        TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 7. GIG_PACKAGES — Pricing packages for service gigs
-- ============================================================

CREATE TABLE gig_packages (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    gig_id          UUID          NOT NULL REFERENCES service_gigs(id) ON DELETE CASCADE,
    tier            package_tier  NOT NULL,
    title           VARCHAR(100)  NOT NULL,
    description     TEXT,
    price           DECIMAL(12,2) NOT NULL,
    delivery_time   VARCHAR(50),
    features        JSONB,

    UNIQUE (gig_id, tier)
);


-- ============================================================
-- 8. BOOKINGS — Orders/bookings for both marketplace models
-- ============================================================

CREATE TABLE bookings (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gig_id            UUID          REFERENCES service_gigs(id) ON DELETE SET NULL,
    job_id            UUID          REFERENCES job_postings(id) ON DELETE SET NULL,
    package_id        UUID          REFERENCES gig_packages(id) ON DELETE SET NULL,
    total_amount      DECIMAL(12,2) NOT NULL,
    commission_rate   DECIMAL(5,2)  NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    worker_earning    DECIMAL(12,2) NOT NULL,
    event_date        DATE,
    event_location    VARCHAR(255),
    requirements      TEXT,
    status            booking_status DEFAULT 'pending',
    completed_at      TIMESTAMP,
    created_at        TIMESTAMP     DEFAULT NOW(),
    updated_at        TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 9. REVIEWS — Ratings and feedback
-- ============================================================

CREATE TABLE reviews (
    id                      UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id              UUID      NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id             UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id             UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating                  INTEGER   NOT NULL CHECK (rating >= 1 AND rating <= 5),
    quality_rating          INTEGER   CHECK (quality_rating >= 1 AND quality_rating <= 5),
    professionalism_rating  INTEGER   CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    communication_rating    INTEGER   CHECK (communication_rating >= 1 AND communication_rating <= 5),
    value_rating            INTEGER   CHECK (value_rating >= 1 AND value_rating <= 5),
    timeliness_rating       INTEGER   CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    comment                 TEXT,
    response                TEXT,
    is_public               BOOLEAN   DEFAULT true,
    created_at              TIMESTAMP DEFAULT NOW(),

    UNIQUE (booking_id, reviewer_id)
);


-- ============================================================
-- 10. CONVERSATIONS — Chat conversation threads
-- ============================================================

CREATE TABLE conversations (
    id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1   UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_2   UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id      UUID      REFERENCES bookings(id) ON DELETE SET NULL,
    job_id          UUID      REFERENCES job_postings(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- 11. MESSAGES — Chat messages between users
-- ============================================================

CREATE TABLE messages (
    id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID      NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id     UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT      NOT NULL,
    attachments     JSONB,
    is_read         BOOLEAN   DEFAULT false,
    created_at      TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- 12. TRANSACTIONS — Financial records
-- ============================================================

CREATE TABLE transactions (
    id              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID              NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payer_id        UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payee_id        UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          DECIMAL(12,2)     NOT NULL,
    commission      DECIMAL(12,2)     NOT NULL,
    net_amount      DECIMAL(12,2)     NOT NULL,
    type            transaction_type  NOT NULL,
    status          transaction_status DEFAULT 'pending',
    payment_method  VARCHAR(50),
    created_at      TIMESTAMP         DEFAULT NOW()
);


-- ============================================================
-- 13. NOTIFICATIONS — In-app notifications
-- ============================================================

CREATE TABLE notifications (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50)  NOT NULL,
    title       VARCHAR(255) NOT NULL,
    message     TEXT,
    link        VARCHAR(255),
    is_read     BOOLEAN      DEFAULT false,
    created_at  TIMESTAMP    DEFAULT NOW()
);


-- ============================================================
-- 14. DISPUTES — Dispute records
-- ============================================================

CREATE TABLE disputes (
    id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID           NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    raised_by   UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      TEXT           NOT NULL,
    evidence    JSONB,
    status      dispute_status DEFAULT 'open',
    resolution  TEXT,
    resolved_by UUID           REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    created_at  TIMESTAMP      DEFAULT NOW()
);


-- ============================================================
-- 15. COMMISSION_SETTINGS — Admin-configurable commission rates
-- ============================================================

CREATE TABLE commission_settings (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name   VARCHAR(50)   NOT NULL,
    min_amount  DECIMAL(12,2) NOT NULL,
    max_amount  DECIMAL(12,2),
    rate        DECIMAL(5,2)  NOT NULL,
    is_active   BOOLEAN       DEFAULT true,
    updated_by  UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_at  TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email             ON users(email);
CREATE INDEX idx_users_role              ON users(role);
CREATE INDEX idx_profiles_user_id        ON profiles(user_id);
CREATE INDEX idx_job_postings_customer   ON job_postings(customer_id);
CREATE INDEX idx_job_postings_status     ON job_postings(status);
CREATE INDEX idx_job_postings_category   ON job_postings(category_id);
CREATE INDEX idx_proposals_job           ON proposals(job_id);
CREATE INDEX idx_proposals_worker        ON proposals(worker_id);
CREATE INDEX idx_gigs_worker             ON service_gigs(worker_id);
CREATE INDEX idx_gigs_category           ON service_gigs(category_id);
CREATE INDEX idx_gigs_status             ON service_gigs(status);
CREATE INDEX idx_bookings_customer       ON bookings(customer_id);
CREATE INDEX idx_bookings_worker         ON bookings(worker_id);
CREATE INDEX idx_bookings_status         ON bookings(status);
CREATE INDEX idx_messages_conversation   ON messages(conversation_id);
CREATE INDEX idx_notifications_user      ON notifications(user_id, is_read);


-- ============================================================
-- SEED DATA — Default service categories
-- ============================================================

INSERT INTO categories (name, slug) VALUES
    ('Photography',      'photography'),
    ('Videography',      'videography'),
    ('Painting & Art',   'painting-art'),
    ('Decoration',       'decoration'),
    ('Makeup & Styling', 'makeup-styling'),
    ('Music & DJ',       'music-dj'),
    ('Catering',         'catering'),
    ('Event Planning',   'event-planning'),
    ('Mehendi',          'mehendi'),
    ('Pandit/Priest',    'pandit-priest');


-- ============================================================
-- TRIGGER: Auto-update updated_at on row modification
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with an updated_at column
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_job_postings_updated_at
    BEFORE UPDATE ON job_postings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_proposals_updated_at
    BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_service_gigs_updated_at
    BEFORE UPDATE ON service_gigs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_commission_settings_updated_at
    BEFORE UPDATE ON commission_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

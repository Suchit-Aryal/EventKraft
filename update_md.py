md_content_raw = r"""# \ud83d\uddc4\ufe0f Database Schema

Core database design for EventKraft using PostgreSQL.

---

## Entity Relationship Diagram (ERD)

```
\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510     \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510     \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  Users  \u2502\u2500\u2500\u2500\u2500\u25b6\u2502 Profiles \u2502     \u2502Categories\u2502
\u2514\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2518     \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518     \u2514\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2518
     \u2502                                \u2502
     \u2502    \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510          \u2502
     \u251c\u2500\u2500\u2500\u25b6\u2502 Job Postings  \u2502\u25c0\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
     \u2502    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
     \u2502            \u2502
     \u2502    \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25bc\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
     \u251c\u2500\u2500\u2500\u25b6\u2502  Proposals    \u2502
     \u2502    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
     \u2502
     \u2502    \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
     \u251c\u2500\u2500\u2500\u25b6\u2502 Service Gigs  \u2502\u25c0\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510 (\ufe0fcategory)
     \u2502    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518          \u2502
     \u2502            \u2502                  \u2502
     \u2502    \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25bc\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510   \u250c\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2510
     \u251c\u2500\u2500\u2500\u25b6\u2502   Bookings    \u2502   \u2502  Packages  \u2502
     \u2502    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
     \u2502            \u2502
     \u2502    \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25bc\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
     \u251c\u2500\u2500\u2500\u25b6\u2502   Reviews     \u2502
     \u2502    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
     \u2502
     \u2502    \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
     \u251c\u2500\u2500\u2500\u25b6\u2502   Messages    \u2502
     \u2502    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
     \u2502
     \u2502    \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
     \u2514\u2500\u2500\u2500\u25b6\u2502 Transactions  \u2502
          \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
```

---

## Table Definitions

### 1. `users`

The core user table. Stores authentication data and role.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Unique user ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| `phone` | VARCHAR(20) | UNIQUE | Phone number |
| `password_hash` | VARCHAR(255) | | bcrypt hashed password |
| `role` | user_role | NOT NULL | User role |
| `is_verified` | BOOLEAN | DEFAULT false | Email verified? |
| `is_active` | BOOLEAN | DEFAULT true | Account active? |
| `profile_complete`| BOOLEAN | DEFAULT false | Has completed onboarding? |
| `google_id` | VARCHAR(255) | UNIQUE | Google OAuth ID |
| `totp_enabled`| BOOLEAN | DEFAULT false | Is 2FA enabled? |
| `totp_secret` | VARCHAR(255) | | 2FA Secret |
| `kyc_status` | VARCHAR(20) | DEFAULT 'none' | KYC status |
| `tagline` | VARCHAR(120) | | User tagline |
| `skills` | TEXT[] | | Array of skills |
| `notification_prefs`| JSONB | DEFAULT '{}' | User notification settings |
| `profile_visible`| BOOLEAN | DEFAULT true | Is profile public? |
| `show_phone` | BOOLEAN | DEFAULT false | Show phone number? |
| `open_messaging` | BOOLEAN | DEFAULT true | Allow messages from anyone? |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Registration date |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

---

### 2. `profiles`

Extended user information. One-to-one with `users`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Profile ID |
| `user_id` | UUID | FK \u2192 users.id, UNIQUE | Owner |
| `first_name` | VARCHAR(100) | NOT NULL | First name |
| `last_name` | VARCHAR(100) | NOT NULL | Last name |
| `avatar_url` | TEXT | | Profile photo URL |
| `cover_photo_url` | TEXT | | Cover photo URL |
| `bio` | TEXT | | About section |
| `city` | VARCHAR(100) | | City/location |
| `address` | TEXT | | Full address |
| `date_of_birth` | DATE | | DOB |
| `gender` | gender_type | | Gender |
| `social_links` | JSONB | | Social media URLs |
| `is_admin_verified` | BOOLEAN | DEFAULT false | Admin verification for workers |
| `avg_rating` | DECIMAL(3,2) | DEFAULT 0.00 | Cached average rating |
| `total_reviews` | INTEGER | DEFAULT 0 | Cached review count |
| `total_completed` | INTEGER | DEFAULT 0 | Completed projects |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 3. `categories`

Service categories (Photography, Videography, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Category ID |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Category name |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | URL-friendly name |
| `description` | TEXT | | Description |
| `icon` | VARCHAR(50) | | Icon name/class |
| `parent_id` | UUID | FK \u2192 categories.id | For sub-categories |
| `is_active` | BOOLEAN | DEFAULT true | |
| `sort_order` | INTEGER | DEFAULT 0 | Display order |

---

### 4. `job_postings`

Customer job posts (Upwork model).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Post ID |
| `customer_id` | UUID | FK \u2192 users.id, NOT NULL | Who posted |
| `category_id` | UUID | FK \u2192 categories.id | Service category |
| `title` | VARCHAR(255) | NOT NULL | Job title |
| `description` | TEXT | NOT NULL | Detailed description |
| `event_type` | VARCHAR(100) | | Wedding, Reception, etc. |
| `event_date` | DATE | | When the event is |
| `event_location` | VARCHAR(255) | | Venue/location |
| `budget_min` | DECIMAL(12,2) | | Minimum budget (NPR) |
| `budget_max` | DECIMAL(12,2) | | Maximum budget (NPR) |
| `proposal_deadline` | DATE | | Last date for proposals |
| `attachments` | JSONB | | Array of file URLs |
| `special_requirements` | TEXT | | Extra notes |
| `status` | job_status | DEFAULT 'draft' | |
| `max_proposals` | INTEGER | DEFAULT 20 | Cap on proposals |
| `selected_worker_id` | UUID | FK \u2192 users.id, NULL | Chosen worker |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 5. `proposals`

Worker proposals on job postings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Proposal ID |
| `job_id` | UUID | FK \u2192 job_postings.id | Which job |
| `worker_id` | UUID | FK \u2192 users.id | Who proposed |
| `cover_letter` | TEXT | NOT NULL | Why they're a good fit |
| `proposed_price` | DECIMAL(12,2) | NOT NULL | Price quote (NPR) |
| `estimated_duration` | VARCHAR(100) | | Timeline |
| `portfolio_links` | JSONB | | Sample work URLs |
| `status` | proposal_status | DEFAULT 'pending' | |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |

**Constraint:** UNIQUE(job_id, worker_id) \u2014 One proposal per worker per job.

---

### 6. `service_gigs`

Worker service listings (Fiverr model).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Gig ID |
| `worker_id` | UUID | FK \u2192 users.id, NOT NULL | Who offers |
| `category_id` | UUID | FK \u2192 categories.id | Service category |
| `title` | VARCHAR(255) | NOT NULL | Gig title |
| `description` | TEXT | NOT NULL | What's offered |
| `tags` | JSONB | | Keywords for search |
| `portfolio_images` | JSONB | | Array of image URLs |
| `portfolio_videos` | JSONB | | Array of video URLs |
| `delivery_time` | VARCHAR(100) | | e.g. "3-5 days" |
| `starting_price` | DECIMAL(12,2) | NOT NULL | Lowest package price (NPR) |
| `faq` | JSONB | | Array of {question, answer} |
| `status` | gig_status | DEFAULT 'draft' | |
| `view_count` | INTEGER | DEFAULT 0 | |
| `impression_count` | INTEGER | DEFAULT 0 | |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 7. `gig_packages`

Pricing packages for service gigs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Package ID |
| `gig_id` | UUID | FK \u2192 service_gigs.id | Parent gig |
| `tier` | package_tier | NOT NULL | Package tier |
| `title` | VARCHAR(100) | NOT NULL | Package name |
| `description` | TEXT | | What's included |
| `price` | DECIMAL(12,2) | NOT NULL | Price (NPR) |
| `delivery_time` | VARCHAR(50) | | e.g. "2 days" |
| `features` | JSONB | | Array of included features |

**Constraint:** UNIQUE(gig_id, tier) \u2014 One package per tier per gig.

---

### 8. `bookings`

Orders/bookings for both marketplace models.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Booking ID |
| `customer_id` | UUID | FK \u2192 users.id | Who booked |
| `worker_id` | UUID | FK \u2192 users.id | Who's providing |
| `gig_id` | UUID | FK \u2192 service_gigs.id | If booked via gig |
| `job_id` | UUID | FK \u2192 job_postings.id | If from job posting |
| `package_id` | UUID | FK \u2192 gig_packages.id | Selected package |
| `total_amount` | DECIMAL(12,2) | NOT NULL | Total price (NPR) |
| `commission_rate` | DECIMAL(5,2) | NOT NULL | Commission % |
| `commission_amount` | DECIMAL(12,2) | NOT NULL | Commission amount (NPR) |
| `worker_earning` | DECIMAL(12,2) | NOT NULL | Amount worker receives |
| `event_date` | DATE | | Event date |
| `event_location` | VARCHAR(255) | | Event venue |
| `requirements` | TEXT | | Customer's special requirements |
| `status` | booking_status | DEFAULT 'pending' | |
| `completed_at` | TIMESTAMP | | When completed |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 9. `reviews`

Ratings and feedback.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Review ID |
| `booking_id` | UUID | FK \u2192 bookings.id | Which order |
| `reviewer_id` | UUID | FK \u2192 users.id | Who wrote it |
| `reviewee_id` | UUID | FK \u2192 users.id | Who it's about |
| `rating` | INTEGER | NOT NULL, CHECK (1-5) | Star rating |
| `quality_rating` | INTEGER | CHECK (1-5) | Quality of work |
| `professionalism_rating` | INTEGER | CHECK (1-5) | Professionalism |
| `communication_rating` | INTEGER | CHECK (1-5) | Communication |
| `value_rating` | INTEGER | CHECK (1-5) | Value for money |
| `timeliness_rating` | INTEGER | CHECK (1-5) | Timeliness |
| `comment` | TEXT | | Written review |
| `response` | TEXT | | Reviewee's reply |
| `is_public` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Constraint:** UNIQUE(booking_id, reviewer_id) \u2014 One review per user per booking.

---

### 10. `conversations`

Chat conversation threads.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Conversation ID |
| `participant_1` | UUID | FK \u2192 users.id | |
| `participant_2` | UUID | FK \u2192 users.id | |
| `booking_id` | UUID | FK \u2192 bookings.id | Related booking |
| `job_id` | UUID | FK \u2192 job_postings.id | Related job |
| `last_message_at` | TIMESTAMP | | For sorting |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 11. `messages`

Chat messages between users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Message ID |
| `conversation_id` | UUID | FK \u2192 conversations.id | Parent conversation |
| `sender_id` | UUID | FK \u2192 users.id | Who sent |
| `receiver_id` | UUID | FK \u2192 users.id | Who receives |
| `content` | TEXT | NOT NULL | Message text |
| `attachments` | JSONB | | Array of attachment URLs |
| `is_read` | BOOLEAN | DEFAULT false | Read status |
| `is_unsent` | BOOLEAN | DEFAULT false | Unsent status |
| `reply_to` | UUID | FK \u2192 messages.id | Replied message |
| `file_url` | TEXT | | Attachment URL |
| `file_name` | TEXT | | Attachment filename |
| `file_type` | TEXT | | Attachment type |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 12. `transactions`

Financial records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Transaction ID |
| `booking_id` | UUID | FK \u2192 bookings.id | Related booking |
| `payer_id` | UUID | FK \u2192 users.id | Who paid |
| `payee_id` | UUID | FK \u2192 users.id | Who received |
| `amount` | DECIMAL(12,2) | NOT NULL | Total amount |
| `commission` | DECIMAL(12,2) | NOT NULL | Platform fee |
| `net_amount` | DECIMAL(12,2) | NOT NULL | After commission |
| `type` | transaction_type | NOT NULL | |
| `status` | transaction_status | DEFAULT 'pending' | |
| `payment_method` | VARCHAR(50) | | e.g. "esewa", "khalti" |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 13. `notifications`

In-app notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | |
| `user_id` | UUID | FK \u2192 users.id | Who receives |
| `type` | VARCHAR(50) | NOT NULL | e.g. "new_proposal" |
| `title` | VARCHAR(255) | NOT NULL | Notification title |
| `message` | TEXT | | Notification body |
| `link` | VARCHAR(255) | | URL to navigate to |
| `is_read` | BOOLEAN | DEFAULT false | |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 14. `disputes`

Dispute records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | |
| `booking_id` | UUID | FK \u2192 bookings.id | Related booking |
| `raised_by` | UUID | FK \u2192 users.id | Who raised it |
| `reason` | TEXT | NOT NULL | Description of issue |
| `evidence` | JSONB | | Uploaded file URLs |
| `status` | dispute_status | DEFAULT 'open' | |
| `resolution` | TEXT | | Admin decision |
| `resolved_by` | UUID | FK \u2192 users.id | Admin who resolved |
| `resolved_at` | TIMESTAMP | | |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 15. `commission_settings`

Admin-configurable commission rates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | |
| `tier_name` | VARCHAR(50) | NOT NULL | e.g. "Tier 1" |
| `min_amount` | DECIMAL(12,2) | NOT NULL | Lower bound (NPR) |
| `max_amount` | DECIMAL(12,2) | | Upper bound (NPR) |
| `rate` | DECIMAL(5,2) | NOT NULL | Commission rate % |
| `is_active` | BOOLEAN | DEFAULT true | |
| `updated_by` | UUID | FK \u2192 users.id | Last admin to change |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |

---

### 16. `kyc_submissions`

Identity verification documents for workers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Submission ID |
| `user_id` | UUID | FK \u2192 users.id, UNIQUE | Worker |
| `document_type` | VARCHAR(30) | NOT NULL | Type of document |
| `doc_front_url` | TEXT | NOT NULL | Front image URL |
| `doc_front_public_id` | TEXT | | Cloudinary public ID |
| `doc_back_url` | TEXT | | Back image URL |
| `doc_back_public_id` | TEXT | | Cloudinary public ID |
| `status` | VARCHAR(20) | DEFAULT 'pending' | Verification status |
| `rejection_reason` | TEXT | | Reason for rejection |
| `reviewed_by` | UUID | FK \u2192 users.id | Admin reviewer |
| `submitted_at` | TIMESTAMP | DEFAULT NOW() | Submission time |
| `reviewed_at` | TIMESTAMP | | Review time |

---

### 17. `portfolio_items`

Worker portfolio images/work samples.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Item ID |
| `user_id` | UUID | FK \u2192 users.id | Worker |
| `image_url` | TEXT | NOT NULL | Image URL |
| `public_id` | TEXT | | Cloudinary public ID |
| `caption` | VARCHAR(200) | | Image caption |
| `sort_order` | INTEGER | DEFAULT 0 | Display order |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

---

## Key Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_email             ON users(email);
CREATE INDEX idx_users_role              ON users(role);
CREATE INDEX idx_users_google_id         ON users(google_id);
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
CREATE INDEX idx_kyc_status              ON kyc_submissions(status);
CREATE INDEX idx_portfolio_user          ON portfolio_items(user_id);
```

---

## Seed Data (Initial Categories)

```sql
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
```

---

\u2190 Back to [01 - Project Overview](./01-project-overview.md)
"""

content = md_content_raw.encode('utf-16', 'surrogatepass').decode('utf-16')

with open('../EventKraft-Blueprint/md/08-database-schema.md', 'w', encoding='utf-8') as f:
    f.write(content)

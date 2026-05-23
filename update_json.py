import json

schema = {
    "document": "08-database-schema",
    "database": "PostgreSQL",
    "tables": [
        {
            "name": "users",
            "description": "Core user table with authentication and role data",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "email", "type": "VARCHAR(255)", "constraints": "UNIQUE, NOT NULL"},
                {"name": "phone", "type": "VARCHAR(20)", "constraints": "UNIQUE"},
                {"name": "password_hash", "type": "VARCHAR(255)", "constraints": ""},
                {"name": "role", "type": "user_role", "constraints": "NOT NULL"},
                {"name": "is_verified", "type": "BOOLEAN", "constraints": "DEFAULT false"},
                {"name": "is_active", "type": "BOOLEAN", "constraints": "DEFAULT true"},
                {"name": "profile_complete", "type": "BOOLEAN", "constraints": "DEFAULT false"},
                {"name": "google_id", "type": "VARCHAR(255)", "constraints": "UNIQUE"},
                {"name": "totp_enabled", "type": "BOOLEAN", "constraints": "DEFAULT false"},
                {"name": "totp_secret", "type": "VARCHAR(255)", "constraints": ""},
                {"name": "kyc_status", "type": "VARCHAR(20)", "constraints": "DEFAULT 'none'"},
                {"name": "tagline", "type": "VARCHAR(120)", "constraints": ""},
                {"name": "skills", "type": "TEXT[]", "constraints": ""},
                {"name": "notification_prefs", "type": "JSONB", "constraints": "DEFAULT '{}'"},
                {"name": "profile_visible", "type": "BOOLEAN", "constraints": "DEFAULT true"},
                {"name": "show_phone", "type": "BOOLEAN", "constraints": "DEFAULT false"},
                {"name": "open_messaging", "type": "BOOLEAN", "constraints": "DEFAULT true"},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"},
                {"name": "updated_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "profiles",
            "description": "Extended user info, one-to-one with users",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "user_id", "type": "UUID", "constraints": "UNIQUE, NOT NULL, REFERENCES users(id)"},
                {"name": "first_name", "type": "VARCHAR(100)", "constraints": "NOT NULL"},
                {"name": "last_name", "type": "VARCHAR(100)", "constraints": "NOT NULL"},
                {"name": "avatar_url", "type": "TEXT", "constraints": ""},
                {"name": "cover_photo_url", "type": "TEXT", "constraints": ""},
                {"name": "bio", "type": "TEXT", "constraints": ""},
                {"name": "city", "type": "VARCHAR(100)", "constraints": ""},
                {"name": "address", "type": "TEXT", "constraints": ""},
                {"name": "date_of_birth", "type": "DATE", "constraints": ""},
                {"name": "gender", "type": "gender_type", "constraints": ""},
                {"name": "social_links", "type": "JSONB", "constraints": ""},
                {"name": "is_admin_verified", "type": "BOOLEAN", "constraints": "DEFAULT false"},
                {"name": "avg_rating", "type": "DECIMAL(3,2)", "constraints": "DEFAULT 0.00"},
                {"name": "total_reviews", "type": "INTEGER", "constraints": "DEFAULT 0"},
                {"name": "total_completed", "type": "INTEGER", "constraints": "DEFAULT 0"},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"},
                {"name": "updated_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "categories",
            "description": "Service categories with optional sub-categories",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "name", "type": "VARCHAR(100)", "constraints": "UNIQUE, NOT NULL"},
                {"name": "slug", "type": "VARCHAR(100)", "constraints": "UNIQUE, NOT NULL"},
                {"name": "description", "type": "TEXT", "constraints": ""},
                {"name": "icon", "type": "VARCHAR(50)", "constraints": ""},
                {"name": "parent_id", "type": "UUID", "constraints": "REFERENCES categories(id)"},
                {"name": "is_active", "type": "BOOLEAN", "constraints": "DEFAULT true"},
                {"name": "sort_order", "type": "INTEGER", "constraints": "DEFAULT 0"}
            ],
            "seed_data": [
                {"name": "Photography", "slug": "photography"},
                {"name": "Videography", "slug": "videography"},
                {"name": "Painting & Art", "slug": "painting-art"},
                {"name": "Decoration", "slug": "decoration"},
                {"name": "Makeup & Styling", "slug": "makeup-styling"},
                {"name": "Music & DJ", "slug": "music-dj"},
                {"name": "Catering", "slug": "catering"},
                {"name": "Event Planning", "slug": "event-planning"},
                {"name": "Mehendi", "slug": "mehendi"},
                {"name": "Pandit/Priest", "slug": "pandit-priest"}
            ]
        },
        {
            "name": "job_postings",
            "description": "Customer job posts (Upwork model)",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "customer_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "category_id", "type": "UUID", "constraints": "REFERENCES categories(id)"},
                {"name": "title", "type": "VARCHAR(255)", "constraints": "NOT NULL"},
                {"name": "description", "type": "TEXT", "constraints": "NOT NULL"},
                {"name": "event_type", "type": "VARCHAR(100)", "constraints": ""},
                {"name": "event_date", "type": "DATE", "constraints": ""},
                {"name": "event_location", "type": "VARCHAR(255)", "constraints": ""},
                {"name": "budget_min", "type": "DECIMAL(12,2)", "constraints": ""},
                {"name": "budget_max", "type": "DECIMAL(12,2)", "constraints": ""},
                {"name": "proposal_deadline", "type": "DATE", "constraints": ""},
                {"name": "attachments", "type": "JSONB", "constraints": ""},
                {"name": "special_requirements", "type": "TEXT", "constraints": ""},
                {"name": "status", "type": "job_status", "constraints": "DEFAULT 'draft'"},
                {"name": "max_proposals", "type": "INTEGER", "constraints": "DEFAULT 20"},
                {"name": "selected_worker_id", "type": "UUID", "constraints": "REFERENCES users(id)"},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"},
                {"name": "updated_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "proposals",
            "description": "Worker proposals on job postings",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "job_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES job_postings(id)"},
                {"name": "worker_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "cover_letter", "type": "TEXT", "constraints": "NOT NULL"},
                {"name": "proposed_price", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "estimated_duration", "type": "VARCHAR(100)", "constraints": ""},
                {"name": "portfolio_links", "type": "JSONB", "constraints": ""},
                {"name": "status", "type": "proposal_status", "constraints": "DEFAULT 'pending'"},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"},
                {"name": "updated_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ],
            "unique_constraints": ["UNIQUE (job_id, worker_id)"]
        },
        {
            "name": "service_gigs",
            "description": "Worker service listings (Fiverr model)",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "worker_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "category_id", "type": "UUID", "constraints": "REFERENCES categories(id)"},
                {"name": "title", "type": "VARCHAR(255)", "constraints": "NOT NULL"},
                {"name": "description", "type": "TEXT", "constraints": "NOT NULL"},
                {"name": "tags", "type": "JSONB", "constraints": ""},
                {"name": "portfolio_images", "type": "JSONB", "constraints": ""},
                {"name": "portfolio_videos", "type": "JSONB", "constraints": ""},
                {"name": "delivery_time", "type": "VARCHAR(100)", "constraints": ""},
                {"name": "starting_price", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "faq", "type": "JSONB", "constraints": ""},
                {"name": "status", "type": "gig_status", "constraints": "DEFAULT 'draft'"},
                {"name": "view_count", "type": "INTEGER", "constraints": "DEFAULT 0"},
                {"name": "impression_count", "type": "INTEGER", "constraints": "DEFAULT 0"},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"},
                {"name": "updated_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "gig_packages",
            "description": "Pricing packages for service gigs",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "gig_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES service_gigs(id)"},
                {"name": "tier", "type": "package_tier", "constraints": "NOT NULL"},
                {"name": "title", "type": "VARCHAR(100)", "constraints": "NOT NULL"},
                {"name": "description", "type": "TEXT", "constraints": ""},
                {"name": "price", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "delivery_time", "type": "VARCHAR(50)", "constraints": ""},
                {"name": "features", "type": "JSONB", "constraints": ""}
            ],
            "unique_constraints": ["UNIQUE (gig_id, tier)"]
        },
        {
            "name": "bookings",
            "description": "Orders/bookings for both marketplace models",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "customer_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "worker_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "gig_id", "type": "UUID", "constraints": "REFERENCES service_gigs(id)"},
                {"name": "job_id", "type": "UUID", "constraints": "REFERENCES job_postings(id)"},
                {"name": "package_id", "type": "UUID", "constraints": "REFERENCES gig_packages(id)"},
                {"name": "total_amount", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "commission_rate", "type": "DECIMAL(5,2)", "constraints": "NOT NULL"},
                {"name": "commission_amount", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "worker_earning", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "event_date", "type": "DATE", "constraints": ""},
                {"name": "event_location", "type": "VARCHAR(255)", "constraints": ""},
                {"name": "requirements", "type": "TEXT", "constraints": ""},
                {"name": "status", "type": "booking_status", "constraints": "DEFAULT 'pending'"},
                {"name": "completed_at", "type": "TIMESTAMP", "constraints": ""},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"},
                {"name": "updated_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "reviews",
            "description": "Ratings and feedback",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "booking_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES bookings(id)"},
                {"name": "reviewer_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "reviewee_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "rating", "type": "INTEGER", "constraints": "NOT NULL, CHECK (rating >= 1 AND rating <= 5)"},
                {"name": "quality_rating", "type": "INTEGER", "constraints": "CHECK (quality_rating >= 1 AND quality_rating <= 5)"},
                {"name": "professionalism_rating", "type": "INTEGER", "constraints": "CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5)"},
                {"name": "communication_rating", "type": "INTEGER", "constraints": "CHECK (communication_rating >= 1 AND communication_rating <= 5)"},
                {"name": "value_rating", "type": "INTEGER", "constraints": "CHECK (value_rating >= 1 AND value_rating <= 5)"},
                {"name": "timeliness_rating", "type": "INTEGER", "constraints": "CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5)"},
                {"name": "comment", "type": "TEXT", "constraints": ""},
                {"name": "response", "type": "TEXT", "constraints": ""},
                {"name": "is_public", "type": "BOOLEAN", "constraints": "DEFAULT true"},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ],
            "unique_constraints": ["UNIQUE (booking_id, reviewer_id)"]
        },
        {
            "name": "conversations",
            "description": "Chat conversation threads",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "participant_1", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "participant_2", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "booking_id", "type": "UUID", "constraints": "REFERENCES bookings(id)"},
                {"name": "job_id", "type": "UUID", "constraints": "REFERENCES job_postings(id)"},
                {"name": "last_message_at", "type": "TIMESTAMP", "constraints": ""},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "messages",
            "description": "Chat messages between users",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "conversation_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES conversations(id)"},
                {"name": "sender_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "receiver_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "content", "type": "TEXT", "constraints": "NOT NULL"},
                {"name": "attachments", "type": "JSONB", "constraints": ""},
                {"name": "is_read", "type": "BOOLEAN", "constraints": "DEFAULT false"},
                {"name": "is_unsent", "type": "BOOLEAN", "constraints": "DEFAULT false"},
                {"name": "reply_to", "type": "UUID", "constraints": "REFERENCES messages(id)"},
                {"name": "file_url", "type": "TEXT", "constraints": ""},
                {"name": "file_name", "type": "TEXT", "constraints": ""},
                {"name": "file_type", "type": "TEXT", "constraints": ""},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "transactions",
            "description": "Financial records",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "booking_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES bookings(id)"},
                {"name": "payer_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "payee_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "amount", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "commission", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "net_amount", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "type", "type": "transaction_type", "constraints": "NOT NULL"},
                {"name": "status", "type": "transaction_status", "constraints": "DEFAULT 'pending'"},
                {"name": "payment_method", "type": "VARCHAR(50)", "constraints": ""},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "notifications",
            "description": "In-app notifications",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "user_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "type", "type": "VARCHAR(50)", "constraints": "NOT NULL"},
                {"name": "title", "type": "VARCHAR(255)", "constraints": "NOT NULL"},
                {"name": "message", "type": "TEXT", "constraints": ""},
                {"name": "link", "type": "VARCHAR(255)", "constraints": ""},
                {"name": "is_read", "type": "BOOLEAN", "constraints": "DEFAULT false"},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "disputes",
            "description": "Dispute records",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "booking_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES bookings(id)"},
                {"name": "raised_by", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "reason", "type": "TEXT", "constraints": "NOT NULL"},
                {"name": "evidence", "type": "JSONB", "constraints": ""},
                {"name": "status", "type": "dispute_status", "constraints": "DEFAULT 'open'"},
                {"name": "resolution", "type": "TEXT", "constraints": ""},
                {"name": "resolved_by", "type": "UUID", "constraints": "REFERENCES users(id)"},
                {"name": "resolved_at", "type": "TIMESTAMP", "constraints": ""},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "commission_settings",
            "description": "Admin-configurable commission rates",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "tier_name", "type": "VARCHAR(50)", "constraints": "NOT NULL"},
                {"name": "min_amount", "type": "DECIMAL(12,2)", "constraints": "NOT NULL"},
                {"name": "max_amount", "type": "DECIMAL(12,2)", "constraints": ""},
                {"name": "rate", "type": "DECIMAL(5,2)", "constraints": "NOT NULL"},
                {"name": "is_active", "type": "BOOLEAN", "constraints": "DEFAULT true"},
                {"name": "updated_by", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "updated_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        },
        {
            "name": "kyc_submissions",
            "description": "Identity verification documents",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "user_id", "type": "UUID", "constraints": "UNIQUE, NOT NULL, REFERENCES users(id)"},
                {"name": "document_type", "type": "VARCHAR(30)", "constraints": "NOT NULL"},
                {"name": "doc_front_url", "type": "TEXT", "constraints": "NOT NULL"},
                {"name": "doc_front_public_id", "type": "TEXT", "constraints": ""},
                {"name": "doc_back_url", "type": "TEXT", "constraints": ""},
                {"name": "doc_back_public_id", "type": "TEXT", "constraints": ""},
                {"name": "status", "type": "VARCHAR(20)", "constraints": "DEFAULT 'pending'"},
                {"name": "rejection_reason", "type": "TEXT", "constraints": ""},
                {"name": "reviewed_by", "type": "UUID", "constraints": "REFERENCES users(id)"},
                {"name": "submitted_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"},
                {"name": "reviewed_at", "type": "TIMESTAMP", "constraints": ""}
            ]
        },
        {
            "name": "portfolio_items",
            "description": "Worker portfolio images",
            "columns": [
                {"name": "id", "type": "UUID", "constraints": "PK, DEFAULT uuid_generate_v4()"},
                {"name": "user_id", "type": "UUID", "constraints": "NOT NULL, REFERENCES users(id)"},
                {"name": "image_url", "type": "TEXT", "constraints": "NOT NULL"},
                {"name": "public_id", "type": "TEXT", "constraints": ""},
                {"name": "caption", "type": "VARCHAR(200)", "constraints": ""},
                {"name": "sort_order", "type": "INTEGER", "constraints": "DEFAULT 0"},
                {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()"}
            ]
        }
    ],
    "total_tables": 17,
    "key_indexes": [
        "idx_users_email ON users(email)",
        "idx_users_role ON users(role)",
        "idx_users_google_id ON users(google_id)",
        "idx_profiles_user_id ON profiles(user_id)",
        "idx_job_postings_customer ON job_postings(customer_id)",
        "idx_job_postings_status ON job_postings(status)",
        "idx_job_postings_category ON job_postings(category_id)",
        "idx_proposals_job ON proposals(job_id)",
        "idx_proposals_worker ON proposals(worker_id)",
        "idx_gigs_worker ON service_gigs(worker_id)",
        "idx_gigs_category ON service_gigs(category_id)",
        "idx_gigs_status ON service_gigs(status)",
        "idx_bookings_customer ON bookings(customer_id)",
        "idx_bookings_worker ON bookings(worker_id)",
        "idx_bookings_status ON bookings(status)",
        "idx_messages_conversation ON messages(conversation_id)",
        "idx_notifications_user ON notifications(user_id, is_read)",
        "idx_kyc_status ON kyc_submissions(status)",
        "idx_portfolio_user ON portfolio_items(user_id)"
    ]
}

with open('../EventKraft-Blueprint/json/08-database-schema.json', 'w') as f:
    json.dump(schema, f, indent=4)

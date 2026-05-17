ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS legal_agreed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS legal_agreed_ip VARCHAR(45),
  ADD COLUMN IF NOT EXISTS legal_agreed_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS advance_deadline TIMESTAMP;

CREATE TABLE IF NOT EXISTS booking_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  agreement_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  agreement_text_hash VARCHAR(64) NOT NULL,
  agreed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  advance_amount DECIMAL(12,2) NOT NULL,
  final_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  UNIQUE(booking_id, user_id)
);

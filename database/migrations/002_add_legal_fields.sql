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
  advance_amount DECIMAL(12,2) NOT NULL CONSTRAINT booking_agreements_advance_amount_nonnegative_chk CHECK (advance_amount >= 0),
  final_amount DECIMAL(12,2) NOT NULL CONSTRAINT booking_agreements_final_amount_nonnegative_chk CHECK (final_amount >= 0),
  total_amount DECIMAL(12,2) NOT NULL CONSTRAINT booking_agreements_total_amount_nonnegative_chk CHECK (total_amount >= 0),
  CONSTRAINT booking_agreements_amounts_sum_chk CHECK (advance_amount + final_amount = total_amount),
  UNIQUE(booking_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_agreements_advance_amount_nonnegative_chk'
  ) THEN
    ALTER TABLE booking_agreements ADD CONSTRAINT booking_agreements_advance_amount_nonnegative_chk
      CHECK (advance_amount >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_agreements_final_amount_nonnegative_chk'
  ) THEN
    ALTER TABLE booking_agreements ADD CONSTRAINT booking_agreements_final_amount_nonnegative_chk
      CHECK (final_amount >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_agreements_total_amount_nonnegative_chk'
  ) THEN
    ALTER TABLE booking_agreements ADD CONSTRAINT booking_agreements_total_amount_nonnegative_chk
      CHECK (total_amount >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_agreements_amounts_sum_chk'
  ) THEN
    ALTER TABLE booking_agreements ADD CONSTRAINT booking_agreements_amounts_sum_chk
      CHECK (advance_amount + final_amount = total_amount);
  END IF;
END $$;

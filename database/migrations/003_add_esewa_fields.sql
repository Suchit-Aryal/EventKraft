ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS advance_transaction_uuid VARCHAR(100),
  ADD COLUMN IF NOT EXISTS advance_esewa_ref_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS advance_paid_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS final_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS final_transaction_uuid VARCHAR(100),
  ADD COLUMN IF NOT EXISTS final_esewa_ref_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS final_paid_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS final_deadline TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_advance_transaction_uuid_uq
  ON bookings (advance_transaction_uuid)
  WHERE advance_transaction_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_advance_esewa_ref_id_uq
  ON bookings (advance_esewa_ref_id)
  WHERE advance_esewa_ref_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_final_transaction_uuid_uq
  ON bookings (final_transaction_uuid)
  WHERE final_transaction_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_final_esewa_ref_id_uq
  ON bookings (final_esewa_ref_id)
  WHERE final_esewa_ref_id IS NOT NULL;

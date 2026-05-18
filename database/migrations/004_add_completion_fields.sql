ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS completion_proof JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS completion_note TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dispute_window_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dispute_raised_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS overdue_flagged_at TIMESTAMP;

UPDATE bookings
SET completion_proof = '[]'::jsonb
WHERE completion_proof IS NULL;

UPDATE bookings
SET completion_proof = jsonb_build_array(completion_proof)
WHERE completion_proof IS NOT NULL
  AND jsonb_typeof(completion_proof) <> 'array';

ALTER TABLE bookings
  ALTER COLUMN completion_proof SET DEFAULT '[]'::jsonb,
  ALTER COLUMN completion_proof SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'completion_proof_is_array_check'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT completion_proof_is_array_check
      CHECK (jsonb_typeof(completion_proof) = 'array');
  END IF;
END $$;

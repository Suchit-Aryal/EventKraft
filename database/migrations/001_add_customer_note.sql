ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_note TEXT;

UPDATE bookings
SET customer_note = LEFT(customer_note, 500)
WHERE customer_note IS NOT NULL
  AND char_length(customer_note) > 500;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_customer_note_max_length_chk'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_customer_note_max_length_chk
      CHECK (customer_note IS NULL OR char_length(customer_note) <= 500);
  END IF;
END $$;

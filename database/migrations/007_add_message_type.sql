ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(30) DEFAULT 'text';

UPDATE messages
SET message_type = 'text'
WHERE message_type IS NULL;

ALTER TABLE messages
  ALTER COLUMN message_type SET DEFAULT 'text',
  ALTER COLUMN message_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_message_type_check'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
      CHECK (message_type IN ('text', 'image', 'system', 'booking_request'));
  END IF;
END $$;

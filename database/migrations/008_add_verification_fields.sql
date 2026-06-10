ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(10),
  ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;

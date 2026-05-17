ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_agreement';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid_advance';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'work_done';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'dispute_raised';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid_final';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'overdue_final';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'legal_action';

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'advance_payment';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'final_payment';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'commission_deduction';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'worker_payout';

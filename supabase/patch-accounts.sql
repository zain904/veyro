-- Multi-bank accounts + transfers (safe migration for existing data)
-- Run after schema.sql on existing projects.

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'account_balance',
  account_type TEXT NOT NULL DEFAULT 'bank' CHECK (account_type IN ('bank', 'cash', 'wallet', 'other')),
  opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;

CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'));

CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_to ON transactions(transfer_to_account_id);

-- Default "Main" account for every profile without one
INSERT INTO accounts (user_id, name, bank_name, color, icon, account_type, opening_balance, is_default, sort_order)
SELECT p.id, 'Main', 'General', '#6366f1', 'account_balance', 'bank', 0, true, 0
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a WHERE a.user_id = p.id AND a.is_default = true
);

-- Users with transactions but no profile-linked account (edge case)
INSERT INTO accounts (user_id, name, bank_name, color, icon, account_type, opening_balance, is_default, sort_order)
SELECT DISTINCT t.user_id, 'Main', 'General', '#6366f1', 'account_balance', 'bank', 0, true, 0
FROM transactions t
WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.user_id = t.user_id);

-- Attach existing transactions to default account
UPDATE transactions t
SET account_id = a.id
FROM accounts a
WHERE t.account_id IS NULL
  AND a.user_id = t.user_id
  AND a.is_default = true;

-- Update delete_user_data to wipe accounts
CREATE OR REPLACE FUNCTION public.delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM transactions WHERE user_id = auth.uid();
  DELETE FROM budgets WHERE user_id = auth.uid();
  DELETE FROM categories WHERE user_id = auth.uid();
  DELETE FROM accounts WHERE user_id = auth.uid();

  UPDATE profiles
  SET
    full_name = 'User',
    avatar_url = NULL,
    savings_goal_target = NULL,
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

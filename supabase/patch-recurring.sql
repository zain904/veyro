-- Recurring transactions (bills, salary, subscriptions)
-- Safe to re-run

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_user_active ON recurring_transactions(user_id, is_active, next_due_date);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recurring" ON recurring_transactions;
CREATE POLICY "Users manage own recurring"
ON recurring_transactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Extend delete_user_data
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
  DELETE FROM recurring_transactions WHERE user_id = auth.uid();
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

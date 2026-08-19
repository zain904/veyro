-- Wipes all user-owned data (transactions, budgets, categories) and resets profile.
-- Safe to re-run.

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

  UPDATE profiles
  SET
    full_name = 'User',
    avatar_url = NULL,
    savings_goal_target = NULL,
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_data() TO authenticated;

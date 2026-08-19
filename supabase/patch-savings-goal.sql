-- Add savings goal target to profiles (safe to re-run)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS savings_goal_target DECIMAL(12, 2);

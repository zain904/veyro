-- Run this in Supabase SQL Editor if categories are missing for existing users
-- (e.g. you signed up before schema.sql was applied)

-- 1. Make sure base schema exists first (run schema.sql if not done)

-- 2. Seed categories for all users who have none
INSERT INTO public.categories (user_id, name, icon, color, type)
SELECT u.id, cat.name, cat.icon, cat.color, cat.type
FROM auth.users u
CROSS JOIN (
  VALUES
    ('Food', 'restaurant', '#ef4444', 'expense'),
    ('Transport', 'directions_car', '#f97316', 'expense'),
    ('Bills', 'receipt_long', '#eab308', 'expense'),
    ('Shopping', 'shopping_bag', '#8b5cf6', 'expense'),
    ('Entertainment', 'movie', '#ec4899', 'expense'),
    ('Health', 'local_hospital', '#14b8a6', 'expense'),
    ('Other', 'more_horiz', '#64748b', 'expense'),
    ('Salary', 'work', '#22c55e', 'income'),
    ('Freelance', 'laptop', '#06b6d4', 'income'),
    ('Investment', 'trending_up', '#3b82f6', 'income'),
    ('Other Income', 'attach_money', '#64748b', 'income')
) AS cat(name, icon, color, type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c WHERE c.user_id = u.id
);

-- 3. Ensure profiles exist for all users
INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', 'User')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

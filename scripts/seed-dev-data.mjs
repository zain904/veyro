/**
 * Dev-only seed script — populates ~30 sample transactions across the last 3 months.
 *
 * Usage:
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=yourpassword npm run seed:dev
 *
 * Requires a signed-up Veyro account with categories already seeded.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://mfvlpmsknlbyjoxtmxqd.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdmxwbXNrbmxieWpveHRteHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTY3ODYsImV4cCI6MjEwMjE5Mjc4Nn0.bp9iJCVFOgRmrhJgRZQAeJ3GUOWRC1hpMeDJUFBwXw8';
const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set SEED_EMAIL and SEED_PASSWORD environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SAMPLE = [
  { type: 'expense', category: 'Groceries', amount: 4500, desc: 'Weekly groceries' },
  { type: 'expense', category: 'Transport', amount: 1200, desc: 'Fuel' },
  { type: 'expense', category: 'Dining Out', amount: 2800, desc: 'Dinner with friends' },
  { type: 'expense', category: 'Utilities', amount: 8500, desc: 'Electricity bill' },
  { type: 'expense', category: 'Rent', amount: 45000, desc: 'Monthly rent' },
  { type: 'expense', category: 'Shopping', amount: 6500, desc: 'Clothes' },
  { type: 'expense', category: 'Entertainment', amount: 1500, desc: 'Netflix + Spotify' },
  { type: 'expense', category: 'Healthcare', amount: 3200, desc: 'Pharmacy' },
  { type: 'expense', category: 'Education', amount: 12000, desc: 'Online course' },
  { type: 'income', category: 'Salary', amount: 185000, desc: 'Monthly salary' },
  { type: 'income', category: 'Freelance', amount: 35000, desc: 'Client project' },
  { type: 'income', category: 'Investments', amount: 8500, desc: 'Dividends' },
  { type: 'income', category: 'Other Income', amount: 5000, desc: 'Gift received' },
  { type: 'expense', category: 'Groceries', amount: 5200, desc: 'Supermarket run' },
  { type: 'expense', category: 'Transport', amount: 900, desc: 'Uber rides' },
  { type: 'expense', category: 'Dining Out', amount: 1800, desc: 'Lunch' },
  { type: 'expense', category: 'Shopping', amount: 4200, desc: 'Electronics accessory' },
  { type: 'expense', category: 'Entertainment', amount: 2200, desc: 'Cinema' },
  { type: 'income', category: 'Salary', amount: 185000, desc: 'Monthly salary' },
  { type: 'income', category: 'Freelance', amount: 22000, desc: 'Side gig' },
  { type: 'expense', category: 'Groceries', amount: 4800, desc: 'Groceries' },
  { type: 'expense', category: 'Utilities', amount: 7200, desc: 'Gas bill' },
  { type: 'expense', category: 'Rent', amount: 45000, desc: 'Rent payment' },
  { type: 'expense', category: 'Healthcare', amount: 4500, desc: 'Doctor visit' },
  { type: 'expense', category: 'Transport', amount: 1100, desc: 'Bus pass' },
  { type: 'expense', category: 'Dining Out', amount: 3500, desc: 'Birthday dinner' },
  { type: 'income', category: 'Salary', amount: 185000, desc: 'Monthly salary' },
  { type: 'income', category: 'Investments', amount: 12000, desc: 'Stock gains' },
  { type: 'expense', category: 'Education', amount: 8000, desc: 'Books' },
  { type: 'expense', category: 'Shopping', amount: 9500, desc: 'Home items' },
  { type: 'expense', category: 'Entertainment', amount: 1800, desc: 'Gaming' },
];

function randomDateInLastMonths(monthsBack = 3): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
  const end = now;
  const ts = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(ts).toISOString().split('T')[0];
}

async function main() {
  console.log('Signing in…');
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authError || !auth.user) {
    console.error('Sign-in failed:', authError?.message);
    process.exit(1);
  }

  const userId = auth.user.id;

  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', userId);

  if (catError || !categories?.length) {
    console.error('Failed to load categories:', catError?.message);
    process.exit(1);
  }

  const catMap = new Map(categories.map(c => [`${c.type}:${c.name}`, c.id]));

  const rows = SAMPLE.map(item => {
    const categoryId = catMap.get(`${item.type}:${item.category}`);
    if (!categoryId) return null;
    return {
      user_id: userId,
      category_id: categoryId,
      type: item.type,
      amount: item.amount,
      description: item.desc,
      transaction_date: randomDateInLastMonths(3),
    };
  }).filter(Boolean);

  if (rows.length === 0) {
    console.error('No matching categories found. Ensure default categories exist.');
    process.exit(1);
  }

  const { error: insertError } = await supabase.from('transactions').insert(rows);
  if (insertError) {
    console.error('Insert failed:', insertError.message);
    process.exit(1);
  }

  console.log(`✓ Seeded ${rows.length} sample transactions for ${EMAIL}`);
}

main();

# Veyro

**Know where your money goes.**

A polished personal finance manager built with Angular 19 and Supabase. Track income, expenses, budgets, accounts, recurring bills, and savings — in English, Urdu, or Arabic. Install as a PWA on mobile.

**Author:** [Zain Ul Abdeen](mailto:zulabdeen86@gmail.com) · **Live:** [veyro-red.vercel.app](https://veyro-red.vercel.app)

## Features

- **Authentication** — Email/password plus **Google** sign-in (free OAuth via Supabase)
- **Smart dashboard** — Safe-to-spend, forecasts, quick add, savings goal, account balances
- **Transactions** — CRUD, search, filters, pagination, CSV **import & export**
- **Recurring** — Weekly/monthly/yearly bills & salary auto-posted when due
- **Accounts** — Multi-bank (PK presets), transfers, archive
- **Budgets** — Monthly category budgets with progress
- **Reports** — Trends, breakdown, CSV export, drill-down
- **Categories** — Full CRUD with icons and colors
- **Settings** — Profile, avatar, currency, language, savings goal, data export/import
- **PWA** — Install to home screen, offline app shell
- **i18n + RTL** — English, Urdu, Arabic
- **Dark / Light mode** — Theme toggle with persistence

## Getting Started

### 1. Clone and install

```bash
cd veyro
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run **`supabase/schema.sql`** in the SQL Editor
3. If upgrading an existing project, also run patches in order:
   - `supabase/patch-locale.sql`
   - `supabase/patch-avatar-storage.sql`
   - `supabase/patch-savings-goal.sql`
   - `supabase/patch-delete-user-data.sql`
   - `supabase/patch-rls-with-check.sql`
   - `supabase/patch-accounts.sql`
   - `supabase/patch-recurring.sql`
4. **Authentication → Providers** — Enable **Google** (free); add redirect URLs:
   - `http://localhost:4200/dashboard`
   - `https://veyro-red.vercel.app/dashboard`
5. Copy URL + anon key from **Settings → API** (see `.env.example`)

### 3. Configure environment

Edit `src/environments/environment.development.ts` and `environment.ts` with your Supabase credentials.

### 4. Run

```bash
npm start          # dev server
npm run build      # production (includes PWA service worker)
npm run test:ci    # unit tests
```

## Deploy

Push to `main` — Vercel auto-deploys. After deploy, run any missing Supabase patches on your production database.

## License

MIT · © Zain Ul Abdeen

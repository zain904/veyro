# Veyro

**Know where your money goes.**

A polished personal finance manager built with Angular 19 and Supabase. Track income, expenses, budgets, and savings — in English, Urdu, or Arabic.

**Author:** [Zain Ul Abdeen](mailto:zulabdeen86@gmail.com) · **Live:** [veyro-red.vercel.app](https://veyro-red.vercel.app)

![Tech Stack](https://img.shields.io/badge/Angular-19-red?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=flat-square)
![Material](https://img.shields.io/badge/Material-UI-blue?style=flat-square)

## Features

- **Authentication** — Sign up / sign in with Supabase Auth (JWT)
- **Smart dashboard** — Safe-to-spend, today's spend, budget forecasts, quick add, savings goal, health status
- **Transactions** — Add, edit, delete with search, filters, and chart drill-down
- **Budgets** — Monthly category budgets with progress and urgency sorting
- **Reports** — Trends, category breakdown, cash flow, CSV export, chart drill-down
- **Categories** — Full CRUD (add, edit, delete) with icons and colors
- **Settings** — Profile, avatar, currency, language, savings goal, export, delete all data
- **i18n + RTL** — English, Urdu, Arabic with right-to-left layout
- **Dark / Light mode** — Theme toggle with persistence
- **Responsive** — Works on desktop and mobile

## Getting Started

### 1. Clone and install

```bash
cd veyro
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run **`supabase/schema.sql`** in the SQL Editor (full schema, safe to re-run)
3. If upgrading an existing project, also run these patches in order:
   - `supabase/patch-locale.sql`
   - `supabase/patch-avatar-storage.sql`
   - `supabase/patch-savings-goal.sql`
   - `supabase/patch-delete-user-data.sql`
   - `supabase/patch-rls-with-check.sql`
   - `supabase/patch-accounts.sql`
4. Copy your project URL and anon key from **Settings → API**

### 3. Configure environment

Edit `src/environments/environment.development.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
};
```

Do the same for `src/environments/environment.ts` for production builds.

### 4. Run the app

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200)

### 5. Run tests

```bash
npm test          # watch mode
npm run test:ci   # single run (CI)
npm run build     # production build
```

## Project Structure

```
src/app/
├── core/           # Services, models, guards, utils
├── features/       # Dashboard, transactions, budgets, reports, categories, settings
├── shared/         # Layout, charts, pipes, empty states
public/i18n/        # en.json, ur.json, ar.json
supabase/           # schema.sql + migration patches
```

## Deploy

Push to `main` — Vercel auto-deploys from GitHub. Ensure production Supabase env vars and redirect URLs are configured for auth.

## License

MIT · © Zain Ul Abdeen

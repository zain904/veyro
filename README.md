# Veyro

**Know where your money goes.**

A polished personal finance manager built with Angular 19 and Supabase. Track income, expenses, budgets, and savings — all in one place.

![Tech Stack](https://img.shields.io/badge/Angular-19-red?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=flat-square)
![Material](https://img.shields.io/badge/Material-UI-blue?style=flat-square)

## Features

- **Authentication** — Sign up / sign in with Supabase Auth (JWT)
- **Dashboard** — Balance, income, expenses, savings at a glance
- **Transactions** — Add, edit, delete with search and filters
- **Budgets** — Set monthly category budgets with progress tracking
- **Reports** — Charts for trends, categories, and savings rate
- **Dark / Light mode** — Theme toggle with persistence
- **Responsive** — Works on desktop and mobile

## Screens

| Login | Dashboard | Transactions | Budgets | Reports |
|-------|-----------|--------------|---------|---------|
| Auth  | Overview  | CRUD + filters | Limits | Charts |

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | Angular 19, Material 19 |
| Backend  | Supabase (Auth + DB)    |
| Database | PostgreSQL              |
| Charts   | ApexCharts              |

## Getting Started

### 1. Clone and install

```bash
cd veyro
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy your project URL and anon key

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

### 5. Create an account

Sign up with email and password. Default expense and income categories are created automatically.

## Project Structure

```
src/app/
├── core/
│   ├── guards/          # Auth guards
│   ├── models/          # TypeScript interfaces
│   └── services/        # Supabase, auth, transactions, budgets
├── features/
│   ├── auth/login/      # Login & signup
│   ├── dashboard/       # Overview screen
│   ├── transactions/    # Transaction management
│   ├── budgets/         # Budget management
│   └── reports/         # Charts & analytics
└── shared/
    ├── components/      # Layout, chart wrapper
    └── pipes/           # Currency formatting
supabase/
└── schema.sql           # Database schema + RLS policies
```

## Database Schema

- **profiles** — User profile (name, currency)
- **categories** — Income/expense categories (auto-seeded on signup)
- **transactions** — Financial transactions
- **budgets** — Monthly category budgets

All tables use Row Level Security (RLS) so users only see their own data.

## Scripts

| Command       | Description              |
|---------------|--------------------------|
| `npm start`   | Dev server on port 4200  |
| `npm run build` | Production build       |
| `npm test`    | Run unit tests           |

## License

MIT

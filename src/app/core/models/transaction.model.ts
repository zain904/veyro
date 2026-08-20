export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'bank' | 'cash' | 'wallet' | 'other';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  bank_name: string | null;
  color: string;
  icon: string;
  account_type: AccountType;
  opening_balance: number;
  is_default: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  balance?: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  account_id: string | null;
  transfer_to_account_id: string | null;
  amount: number;
  type: TransactionType;
  description: string | null;
  transaction_date: string;
  created_at?: string;
  updated_at?: string;
  category?: Category;
  account?: Account;
  transfer_to_account?: Account;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at?: string;
  updated_at?: string;
  category?: Category;
  spent?: number;
  percentage?: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  locale?: string | null;
  savings_goal_target?: number | null;
  created_at?: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlySavings: number;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
}

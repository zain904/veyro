import { TransactionType } from './transaction.model';

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  category_id: string | null;
  account_id: string | null;
  amount: number;
  type: Exclude<TransactionType, 'transfer'>;
  description: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  category?: { id: string; name: string; color: string; icon: string };
  account?: { id: string; name: string; color: string };
}

export interface RecurringInput {
  category_id?: string | null;
  account_id?: string | null;
  amount: number;
  type: Exclude<TransactionType, 'transfer'>;
  description?: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
}

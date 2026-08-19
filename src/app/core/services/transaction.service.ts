import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Category, Transaction, TransactionType } from '../models/transaction.model';

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  search?: string;
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  constructor(private supabase: SupabaseService) {}

  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    let query = this.supabase.client
      .from('transactions')
      .select('*, category:categories(*)')
      .order('transaction_date', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }
    if (filters?.startDate && filters?.endDate) {
      query = query.gte('transaction_date', filters.startDate).lte('transaction_date', filters.endDate);
    } else if (filters?.month && filters?.year) {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endMonth = filters.month === 12 ? 1 : filters.month + 1;
      const endYear = filters.month === 12 ? filters.year + 1 : filters.year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
      query = query.gte('transaction_date', startDate).lt('transaction_date', endDate);
    } else if (filters?.year) {
      const startDate = `${filters.year}-01-01`;
      const endDate = `${filters.year + 1}-01-01`;
      query = query.gte('transaction_date', startDate).lt('transaction_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Transaction[];
  }

  async getRecentTransactions(limit = 5, month?: number, year?: number): Promise<Transaction[]> {
    let query = this.supabase.client
      .from('transactions')
      .select('*, category:categories(*)')
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
      query = query.gte('transaction_date', startDate).lt('transaction_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Transaction[];
  }

  async hasAnyTransactions(): Promise<boolean> {
    const { count, error } = await this.supabase.client
      .from('transactions')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async getYearlyStats(year: number): Promise<{ income: number; expenses: number }> {
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;

    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, type')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    if (error) throw error;

    const rows = data ?? [];
    return {
      income: rows.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      expenses: rows.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    };
  }

  async createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .insert({
        ...transaction,
        user_id: this.supabase.currentUser!.id,
      })
      .select('*, category:categories(*)')
      .single();

    if (error) throw error;
    return data as Transaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select('*, category:categories(*)')
      .single();

    if (error) throw error;
    return data as Transaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getMonthlyStats(month: number, year: number): Promise<{ income: number; expenses: number }> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, type')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    if (error) throw error;

    const transactions = data ?? [];
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return { income, expenses };
  }

  async getExpensesByCategory(month: number, year: number): Promise<{ id: string; name: string; amount: number; color: string }[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, category_id, category:categories(id, name, color)')
      .eq('type', 'expense')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    if (error) throw error;

    const categoryMap = new Map<string, { id: string; name: string; amount: number; color: string }>();
    for (const t of data ?? []) {
      const raw = t.category as unknown;
      const cat = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string; color: string } | null;
      const id = cat?.id ?? t.category_id ?? 'uncategorized';
      const name = cat?.name ?? 'Uncategorized';
      const color = cat?.color ?? '#64748b';
      const existing = categoryMap.get(id);
      if (existing) {
        existing.amount += Number(t.amount);
      } else {
        categoryMap.set(id, { id, name, amount: Number(t.amount), color });
      }
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);
  }

  async getYearTrend(year: number, locale = 'en'): Promise<{ month: string; income: number; expenses: number }[]> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, type, transaction_date')
      .gte('transaction_date', `${year}-01-01`)
      .lt('transaction_date', `${year + 1}-01-01`);

    if (error) throw error;

    const bucketMap = new Map<string, { income: number; expenses: number }>();
    for (const t of data ?? []) {
      const key = t.transaction_date.slice(0, 7);
      const bucket = bucketMap.get(key) ?? { income: 0, expenses: 0 };
      if (t.type === 'income') bucket.income += Number(t.amount);
      else bucket.expenses += Number(t.amount);
      bucketMap.set(key, bucket);
    }

    const results: { month: string; income: number; expenses: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, '0')}`;
      const stats = bucketMap.get(key) ?? { income: 0, expenses: 0 };
      const date = new Date(year, m - 1, 1);
      results.push({
        month: date.toLocaleDateString(locale, { month: 'short' }),
        ...stats,
      });
    }
    return results;
  }

  async getExpensesByCategoryForYear(year: number): Promise<{ id: string; name: string; amount: number; color: string }[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;

    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, category_id, category:categories(id, name, color)')
      .eq('type', 'expense')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    if (error) throw error;

    const categoryMap = new Map<string, { id: string; name: string; amount: number; color: string }>();
    for (const t of data ?? []) {
      const raw = t.category as unknown;
      const cat = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string; color: string } | null;
      const id = cat?.id ?? t.category_id ?? 'uncategorized';
      const name = cat?.name ?? 'Uncategorized';
      const color = cat?.color ?? '#64748b';
      const existing = categoryMap.get(id);
      if (existing) {
        existing.amount += Number(t.amount);
      } else {
        categoryMap.set(id, { id, name, amount: Number(t.amount), color });
      }
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);
  }

  async getMonthlyTrend(months = 6, locale = 'en'): Promise<{ month: string; income: number; expenses: number }[]> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
    const endMonth = now.getMonth() + 2;
    const endYear = endMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
    const endDate = `${endYear}-${String(endMonth > 12 ? 1 : endMonth).padStart(2, '0')}-01`;

    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, type, transaction_date')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    if (error) throw error;

    const bucketMap = new Map<string, { income: number; expenses: number }>();
    for (const t of data ?? []) {
      const key = t.transaction_date.slice(0, 7);
      const bucket = bucketMap.get(key) ?? { income: 0, expenses: 0 };
      if (t.type === 'income') bucket.income += Number(t.amount);
      else bucket.expenses += Number(t.amount);
      bucketMap.set(key, bucket);
    }

    const results: { month: string; income: number; expenses: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const stats = bucketMap.get(key) ?? { income: 0, expenses: 0 };
      results.push({
        month: date.toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
        ...stats,
      });
    }
    return results;
  }

  async getDailySpending(month: number, year: number): Promise<{ day: string; amount: number }[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, transaction_date')
      .eq('type', 'expense')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    if (error) throw error;

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyMap = new Map<number, number>();

    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap.set(d, 0);
    }

    for (const t of data ?? []) {
      const day = new Date(t.transaction_date).getDate();
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(t.amount));
    }

    return Array.from(dailyMap.entries()).map(([day, amount]) => ({
      day: String(day),
      amount,
    }));
  }

  async getIncomeByCategory(month: number, year: number): Promise<{ name: string; amount: number; color: string }[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, category:categories(name, color)')
      .eq('type', 'income')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    if (error) throw error;

    const categoryMap = new Map<string, { name: string; amount: number; color: string }>();
    for (const t of data ?? []) {
      const raw = t.category as unknown;
      const cat = (Array.isArray(raw) ? raw[0] : raw) as { name: string; color: string } | null;
      const name = cat?.name ?? 'Uncategorized';
      const color = cat?.color ?? '#64748b';
      const existing = categoryMap.get(name);
      if (existing) {
        existing.amount += Number(t.amount);
      } else {
        categoryMap.set(name, { name, amount: Number(t.amount), color });
      }
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);
  }

  async getStatsForRange(startDate: string, endDate: string): Promise<{ income: number; expenses: number }> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, type')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (error) throw error;

    const rows = data ?? [];
    return {
      income: rows.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      expenses: rows.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    };
  }

  async getExpensesByCategoryForRange(startDate: string, endDate: string): Promise<{ name: string; amount: number; color: string }[]> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, category:categories(name, color)')
      .eq('type', 'expense')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (error) throw error;

    const categoryMap = new Map<string, { name: string; amount: number; color: string }>();
    for (const t of data ?? []) {
      const raw = t.category as unknown;
      const cat = (Array.isArray(raw) ? raw[0] : raw) as { name: string; color: string } | null;
      const name = cat?.name ?? 'Uncategorized';
      const color = cat?.color ?? '#64748b';
      const existing = categoryMap.get(name);
      if (existing) {
        existing.amount += Number(t.amount);
      } else {
        categoryMap.set(name, { name, amount: Number(t.amount), color });
      }
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);
  }

  async getTrendForRange(startDate: string, endDate: string, locale = 'en'): Promise<{ month: string; income: number; expenses: number }[]> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, type, transaction_date')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (error) throw error;

    const bucketMap = new Map<string, { income: number; expenses: number }>();
    for (const t of data ?? []) {
      const key = t.transaction_date.slice(0, 7);
      const bucket = bucketMap.get(key) ?? { income: 0, expenses: 0 };
      if (t.type === 'income') bucket.income += Number(t.amount);
      else bucket.expenses += Number(t.amount);
      bucketMap.set(key, bucket);
    }

    return Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, stats]) => {
        const [y, m] = key.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
        return { month: label, ...stats };
      });
  }

  daysInRange(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  }

  previousRange(startDate: string, endDate: string): { startDate: string; endDate: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = this.daysInRange(startDate, endDate);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days + 1);
    return {
      startDate: prevStart.toISOString().slice(0, 10),
      endDate: prevEnd.toISOString().slice(0, 10),
    };
  }

  async getTodayExpenses(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount')
      .eq('type', 'expense')
      .eq('transaction_date', today);

    if (error) throw error;
    return (data ?? []).reduce((s, t) => s + Number(t.amount), 0);
  }

  async hasIncomeInMonth(month: number, year: number): Promise<boolean> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { count, error } = await this.supabase.client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'income')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async getDaysSinceLastTransaction(): Promise<number | null> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('transaction_date')
      .order('transaction_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data?.transaction_date) return null;

    const last = new Date(data.transaction_date);
    const today = new Date();
    last.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - last.getTime()) / 86400000);
  }

  async getLastExpense(): Promise<Transaction | null> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('type', 'expense')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as Transaction | null) ?? null;
  }

  async getFrequentExpenseCategories(limit = 6): Promise<Category[]> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('category_id, category:categories(*)')
      .eq('type', 'expense')
      .not('category_id', 'is', null)
      .order('transaction_date', { ascending: false })
      .limit(40);

    if (error) throw error;

    const counts = new Map<string, { count: number; category: Category }>();
    for (const row of data ?? []) {
      const raw = row.category as unknown;
      const cat = (Array.isArray(raw) ? raw[0] : raw) as Category | null;
      if (!cat?.id) continue;
      const existing = counts.get(cat.id);
      if (existing) existing.count += 1;
      else counts.set(cat.id, { count: 1, category: cat });
    }

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(x => x.category);
  }
}

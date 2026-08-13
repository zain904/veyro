import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Category, TransactionType } from '../models/transaction.model';

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at'>[] = [
  { name: 'Food', icon: 'restaurant', color: '#ef4444', type: 'expense' },
  { name: 'Transport', icon: 'directions_car', color: '#f97316', type: 'expense' },
  { name: 'Bills', icon: 'receipt_long', color: '#eab308', type: 'expense' },
  { name: 'Shopping', icon: 'shopping_bag', color: '#8b5cf6', type: 'expense' },
  { name: 'Entertainment', icon: 'movie', color: '#ec4899', type: 'expense' },
  { name: 'Health', icon: 'local_hospital', color: '#14b8a6', type: 'expense' },
  { name: 'Other', icon: 'more_horiz', color: '#64748b', type: 'expense' },
  { name: 'Salary', icon: 'work', color: '#22c55e', type: 'income' },
  { name: 'Freelance', icon: 'laptop', color: '#06b6d4', type: 'income' },
  { name: 'Investment', icon: 'trending_up', color: '#3b82f6', type: 'income' },
  { name: 'Other Income', icon: 'attach_money', color: '#64748b', type: 'income' },
];

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private initializedForUser: string | null = null;

  constructor(private supabase: SupabaseService) {}

  async initializeForCurrentUser(): Promise<void> {
    await this.supabase.whenReady();

    const user = this.supabase.currentUser;
    if (!user || this.initializedForUser === user.id) return;

    await this.ensureProfile(user.id, user.user_metadata?.['full_name']);
    await this.ensureDefaultCategories(user.id);

    this.initializedForUser = user.id;
  }

  async getCategories(type?: TransactionType): Promise<Category[]> {
    await this.supabase.whenReady();
    await this.initializeForCurrentUser();

    let query = this.supabase.client
      .from('categories')
      .select('*')
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Category[];
  }

  async createCategory(category: Partial<Category>): Promise<Category> {
    const { data, error } = await this.supabase.client
      .from('categories')
      .insert({
        ...category,
        user_id: this.supabase.currentUser!.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  }

  private async ensureProfile(userId: string, fullName?: string): Promise<void> {
    const { data: profile } = await this.supabase.client
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profile) return;

    const { error } = await this.supabase.client.from('profiles').insert({
      id: userId,
      full_name: fullName ?? 'User',
    });

    if (error && !error.message.includes('duplicate')) {
      console.error('Failed to create profile', error);
    }
  }

  private async ensureDefaultCategories(userId: string): Promise<void> {
    const { count, error: countError } = await this.supabase.client
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Categories table not ready:', countError.message);
      throw countError;
    }

    if (count && count > 0) return;

    const rows = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      user_id: userId,
    }));

    const { error: insertError } = await this.supabase.client
      .from('categories')
      .insert(rows);

    if (insertError) {
      console.error('Failed to seed categories', insertError);
      throw insertError;
    }
  }

  async getCategoriesWithStats(month: number, year: number): Promise<(Category & { spent: number; income: number })[]> {
    const categories = await this.getCategories();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('amount, type, category_id')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    if (error) throw error;

    const stats = new Map<string, { spent: number; income: number }>();
    for (const t of data ?? []) {
      if (!t.category_id) continue;
      const cur = stats.get(t.category_id) ?? { spent: 0, income: 0 };
      if (t.type === 'expense') cur.spent += Number(t.amount);
      else cur.income += Number(t.amount);
      stats.set(t.category_id, cur);
    }

    return categories.map(c => ({
      ...c,
      spent: stats.get(c.id)?.spent ?? 0,
      income: stats.get(c.id)?.income ?? 0,
    }));
  }
}

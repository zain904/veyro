import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { TransactionService } from './transaction.service';
import { RecurringFrequency, RecurringTransaction, RecurringInput } from '../models/recurring.model';

@Injectable({ providedIn: 'root' })
export class RecurringService {
  constructor(
    private supabase: SupabaseService,
    private transactionService: TransactionService,
  ) {}

  async getRecurring(includeInactive = false): Promise<RecurringTransaction[]> {
    let query = this.supabase.client
      .from('recurring_transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .order('next_due_date');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as RecurringTransaction[];
  }

  async createRecurring(input: RecurringInput): Promise<RecurringTransaction> {
    const { data, error } = await this.supabase.client
      .from('recurring_transactions')
      .insert({
        user_id: this.supabase.currentUser!.id,
        category_id: input.category_id ?? null,
        account_id: input.account_id ?? null,
        amount: input.amount,
        type: input.type,
        description: input.description ?? null,
        frequency: input.frequency,
        start_date: input.start_date,
        end_date: input.end_date ?? null,
        next_due_date: input.start_date,
        is_active: true,
      })
      .select('*, category:categories(*), account:accounts(*)')
      .single();

    if (error) throw error;
    return data as RecurringTransaction;
  }

  async updateRecurring(id: string, updates: Partial<RecurringInput & { is_active?: boolean; next_due_date?: string }>): Promise<RecurringTransaction> {
    const { data, error } = await this.supabase.client
      .from('recurring_transactions')
      .update(updates)
      .eq('id', id)
      .select('*, category:categories(*), account:accounts(*)')
      .single();

    if (error) throw error;
    return data as RecurringTransaction;
  }

  async deleteRecurring(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('recurring_transactions').delete().eq('id', id);
    if (error) throw error;
  }

  async processDueRecurring(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const { data: due, error } = await this.supabase.client
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', today);

    if (error) throw error;
    if (!due?.length) return 0;

    let created = 0;
    for (const item of due) {
      const endDate = item.end_date as string | null;
      if (endDate && item.next_due_date > endDate) {
        await this.updateRecurring(item.id, { is_active: false });
        continue;
      }

      await this.transactionService.createTransaction({
        type: item.type,
        amount: item.amount,
        category_id: item.category_id,
        account_id: item.account_id,
        description: item.description ?? `Recurring · ${item.frequency}`,
        transaction_date: item.next_due_date,
      });

      const next = this.advanceDate(item.next_due_date, item.frequency as RecurringFrequency);
      const shouldDeactivate = endDate && next > endDate;
      await this.updateRecurring(item.id, {
        next_due_date: next,
        is_active: shouldDeactivate ? false : true,
      });
      created++;
    }

    return created;
  }

  advanceDate(dateStr: string, frequency: RecurringFrequency): string {
    const d = new Date(dateStr);
    if (frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }
}

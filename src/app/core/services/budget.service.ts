import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Budget } from '../models/transaction.model';
import { TransactionService } from './transaction.service';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  constructor(
    private supabase: SupabaseService,
    private transactionService: TransactionService
  ) {}

  async getBudgets(month: number, year: number): Promise<Budget[]> {
    const { data, error } = await this.supabase.client
      .from('budgets')
      .select('*, category:categories(*)')
      .eq('month', month)
      .eq('year', year);

    if (error) throw error;

    const budgets = (data ?? []) as Budget[];
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data: expenses } = await this.supabase.client
      .from('transactions')
      .select('amount, category_id')
      .eq('type', 'expense')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    const spentByCategory = new Map<string, number>();
    for (const t of expenses ?? []) {
      if (t.category_id) {
        spentByCategory.set(
          t.category_id,
          (spentByCategory.get(t.category_id) ?? 0) + Number(t.amount)
        );
      }
    }

    return budgets.map(budget => {
      const spent = spentByCategory.get(budget.category_id) ?? 0;
      return {
        ...budget,
        spent,
        percentage: budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
      };
    });
  }

  async upsertBudget(budget: Partial<Budget>): Promise<Budget> {
    const { data, error } = await this.supabase.client
      .from('budgets')
      .upsert({
        ...budget,
        user_id: this.supabase.currentUser!.id,
      }, { onConflict: 'user_id,category_id,month,year' })
      .select('*, category:categories(*)')
      .single();

    if (error) throw error;
    return data as Budget;
  }

  async deleteBudget(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

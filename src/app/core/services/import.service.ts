import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CategoryService } from './category.service';
import { AccountService } from './account.service';
import { CsvImportRow, parseTransactionCsv } from '../utils/csv-import.util';
import { Category, TransactionType } from '../models/transaction.model';

export interface ImportPreview {
  rows: CsvImportRow[];
  errors: string[];
  skipped: number;
  validCount: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class ImportService {
  constructor(
    private supabase: SupabaseService,
    private categoryService: CategoryService,
    private accountService: AccountService,
  ) {}

  parseFile(content: string): ImportPreview {
    const result = parseTransactionCsv(content);
    return {
      rows: result.rows,
      errors: result.errors,
      skipped: result.skipped,
      validCount: result.rows.length,
    };
  }

  async importRows(rows: CsvImportRow[]): Promise<ImportResult> {
    if (rows.length === 0) {
      return { imported: 0, skipped: 0, errors: ['No valid rows to import.'] };
    }

    const [categories, accounts] = await Promise.all([
      this.categoryService.getCategories(),
      this.accountService.getAccounts(),
    ]);
    const defaultAccount = await this.accountService.getDefaultAccount();
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c]));
    const accountMap = new Map(accounts.map(a => [a.name.toLowerCase(), a]));

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        const categoryId = await this.resolveCategoryId(row.type, row.categoryName, categoryMap);
        const account = row.accountName
          ? accountMap.get(row.accountName.toLowerCase()) ?? defaultAccount
          : defaultAccount;

        const { error } = await this.supabase.client.from('transactions').insert({
          user_id: this.supabase.currentUser!.id,
          type: row.type,
          amount: row.amount,
          transaction_date: row.transaction_date,
          description: row.description || null,
          category_id: categoryId,
          account_id: account.id,
        });

        if (error) {
          skipped++;
          errors.push(`Row ${row.rowNumber}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (err) {
        skipped++;
        errors.push(`Row ${row.rowNumber}: ${err instanceof Error ? err.message : 'Import failed'}`);
      }
    }

    return { imported, skipped, errors };
  }

  private async resolveCategoryId(
    type: TransactionType,
    name: string,
    cache: Map<string, Category>,
  ): Promise<string | null> {
    if (type === 'transfer') return null;

    const key = (name || 'Uncategorized').toLowerCase();
    const existing = cache.get(key);
    if (existing) return existing.id;

    const created = await this.categoryService.createCategory({
      name: name || 'Uncategorized',
      type: type as 'income' | 'expense',
      icon: type === 'income' ? 'payments' : 'receipt',
      color: type === 'income' ? '#22c55e' : '#64748b',
    });
    cache.set(created.name.toLowerCase(), created);
    return created.id;
  }
}

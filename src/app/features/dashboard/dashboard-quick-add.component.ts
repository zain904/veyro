import { Component, OnInit, signal, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountService } from '../../core/services/account.service';
import { TransactionService } from '../../core/services/transaction.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { Category, Transaction } from '../../core/models/transaction.model';
import { CurrencyService } from '../../core/services/currency.service';
import { ToastService } from '../../core/services/toast.service';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';

@Component({
  selector: 'app-dashboard-quick-add',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatChipsModule, FormsModule, TranslatePipe, VeyroCurrencyPipe,
  ],
  templateUrl: './dashboard-quick-add.component.html',
  styleUrl: './dashboard-quick-add.component.scss',
})
export class DashboardQuickAddComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);
  private transactionService = inject(TransactionService);
  private refresh = inject(DataRefreshService);
  private toast = inject(ToastService);
  private lang = inject(LanguageService);
  currencyService = inject(CurrencyService);

  added = output<void>();

  amount: number | null = null;
  selectedCategoryId = signal<string | null>(null);
  defaultAccountId = signal<string | null>(null);
  frequentCategories = signal<Category[]>([]);
  lastExpense = signal<Transaction | null>(null);
  saving = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCategories();
  }

  async loadCategories(): Promise<void> {
    try {
      const [frequent, last, defaultAcc] = await Promise.all([
        this.transactionService.getFrequentExpenseCategories(6),
        this.transactionService.getLastExpense(),
        this.accountService.getDefaultAccount(),
      ]);
      this.frequentCategories.set(frequent);
      this.lastExpense.set(last);
      this.defaultAccountId.set(defaultAcc.id);
      if (frequent.length > 0 && !this.selectedCategoryId()) {
        this.selectedCategoryId.set(frequent[0].id);
      }
    } catch {
      const cats = await this.categoryService.getCategories('expense');
      this.frequentCategories.set(cats.slice(0, 6));
      if (cats[0]) this.selectedCategoryId.set(cats[0].id);
    }
  }

  selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
  }

  async submit(): Promise<void> {
    const amount = this.amount;
    const categoryId = this.selectedCategoryId();
    if (!amount || amount <= 0 || !categoryId) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.transactionService.createTransaction({
        type: 'expense',
        amount,
        category_id: categoryId,
        account_id: this.defaultAccountId() ?? undefined,
        transaction_date: new Date().toISOString().slice(0, 10),
      });
      this.amount = null;
      this.refresh.notify('transaction');
      this.added.emit();
    } catch {
      this.error.set(this.lang.instant('errors.saveFailed'));
    } finally {
      this.saving.set(false);
    }
  }

  async repeatLast(): Promise<void> {
    const last = this.lastExpense();
    if (!last?.category_id) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.transactionService.createTransaction({
        type: 'expense',
        amount: last.amount,
        category_id: last.category_id,
        account_id: last.account_id ?? this.defaultAccountId() ?? undefined,
        description: last.description ?? undefined,
        transaction_date: new Date().toISOString().slice(0, 10),
      });
      this.refresh.notify('transaction');
      this.added.emit();
    } catch {
      this.error.set(this.lang.instant('errors.saveFailed'));
    } finally {
      this.saving.set(false);
    }
  }
}

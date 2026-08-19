import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { LanguageService } from '../../core/services/language.service';
import { Transaction, Category, TransactionType } from '../../core/models/transaction.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { TransactionDialogComponent } from './transaction-dialog/transaction-dialog.component';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../core/services/toast.service';
import { MONTHS, yearOptions, monthLabel, formatShortDate } from '../../core/utils/date.util';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDialogModule, MatChipsModule, FormsModule, VeyroCurrencyPipe,
    EmptyStateComponent, TranslatePipe,
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent implements OnInit, OnDestroy {
  private refresh = inject(DataRefreshService);
  private confirmDialog = inject(ConfirmDialogService);
  private lang = inject(LanguageService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private sub?: Subscription;
  private langSub?: Subscription;

  loading = signal(true);
  error = signal<string | null>(null);
  transactions = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);

  searchQuery = '';
  filterType: TransactionType | '' = '';
  filterCategory = '';
  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();

  months = MONTHS;
  years = yearOptions(5);

  constructor(
    private transactionService: TransactionService,
    private categoryService: CategoryService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {}

  get periodLabel(): string {
    return monthLabel(this.filterMonth, this.filterYear, this.lang.currentLang());
  }

  getMonthLabel(month: number): string {
    return monthLabel(month, this.filterYear, this.lang.currentLang());
  }

  get totalIncome(): number {
    return this.transactions()
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
  }

  get totalExpenses(): number {
    return this.transactions()
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
  }

  get netBalance(): number {
    return this.totalIncome - this.totalExpenses;
  }

  get incomeCount(): number {
    return this.transactions().filter(t => t.type === 'income').length;
  }

  get expenseCount(): number {
    return this.transactions().filter(t => t.type === 'expense').length;
  }

  get transactionCount(): number {
    return this.transactions().length;
  }

  async ngOnInit(): Promise<void> {
    const cats = await this.categoryService.getCategories();
    this.categories.set(cats);

    this.route.queryParamMap.subscribe(params => {
      const month = params.get('month');
      const year = params.get('year');
      const type = params.get('type') as TransactionType | null;
      const category = params.get('category');
      if (month) this.filterMonth = Number(month);
      if (year) this.filterYear = Number(year);
      if (type === 'income' || type === 'expense') this.filterType = type;
      else if (type === null && !params.has('type')) this.filterType = '';
      if (category) this.filterCategory = category;
      else if (!params.has('category')) this.filterCategory = '';
      this.loadTransactions();
    });

    this.sub = this.refresh.refresh$.subscribe(() => this.loadTransactions());
    this.langSub = this.translate.onLangChange.subscribe(() => this.loadTransactions());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.langSub?.unsubscribe();
  }

  async loadTransactions(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.transactionService.getTransactions({
        type: this.filterType || undefined,
        categoryId: this.filterCategory || undefined,
        search: this.searchQuery || undefined,
        month: this.filterMonth,
        year: this.filterYear,
      });
      this.transactions.set(data);
    } catch (err) {
      console.error(err);
      this.error.set(this.lang.instant('errors.loadFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(): void {
    this.loadTransactions();
  }

  openDialog(transaction?: Transaction): void {
    const ref = this.dialog.open(TransactionDialogComponent, {
      width: '440px',
      data: { transaction },
    });

    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        if (transaction) {
          await this.transactionService.updateTransaction(transaction.id, result);
        } else {
          await this.transactionService.createTransaction(result);
        }
        this.refresh.notify('transaction');
        await this.loadTransactions();
      } catch (err) {
        console.error(err);
        this.toast.error('errors.saveFailed');
      }
    });
  }

  async deleteTransaction(tx: Transaction): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: this.lang.instant('transactions.deleteTitle'),
      message: this.lang.instant('transactions.deleteMessage'),
      confirmLabel: this.lang.instant('transactions.deleteConfirm'),
      confirmColor: 'warn',
      icon: 'delete',
    });
    if (!confirmed) return;
    try {
      await this.transactionService.deleteTransaction(tx.id);
      this.refresh.notify('transaction');
      await this.loadTransactions();
    } catch (err) {
      console.error(err);
      this.toast.error('errors.deleteFailed');
    }
  }

  formatDate = (dateStr: string) => formatShortDate(dateStr, this.lang.currentLang());

  get groupedByDate(): { date: string; items: Transaction[] }[] {
    const groups = new Map<string, Transaction[]>();
    for (const tx of this.transactions()) {
      const key = tx.transaction_date;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }
    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }
}

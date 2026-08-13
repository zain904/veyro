import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
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
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { Transaction, Category, TransactionType } from '../../core/models/transaction.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { TransactionDialogComponent } from './transaction-dialog/transaction-dialog.component';
import { MONTHS, yearOptions, monthLabel, formatShortDate } from '../../core/utils/date.util';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDialogModule, MatChipsModule, FormsModule, VeyroCurrencyPipe,
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent implements OnInit, OnDestroy {
  private refresh = inject(DataRefreshService);
  private sub?: Subscription;

  loading = signal(true);
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
    private dialog: MatDialog
  ) {}

  get periodLabel(): string {
    return monthLabel(this.filterMonth, this.filterYear);
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
    await this.loadTransactions();
    this.sub = this.refresh.refresh$.subscribe(() => this.loadTransactions());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async loadTransactions(): Promise<void> {
    this.loading.set(true);
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
      }
    });
  }

  async deleteTransaction(tx: Transaction): Promise<void> {
    if (!confirm('Delete this transaction?')) return;
    try {
      await this.transactionService.deleteTransaction(tx.id);
      this.refresh.notify('transaction');
      await this.loadTransactions();
    } catch (err) {
      console.error(err);
    }
  }

  formatDate = formatShortDate;

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

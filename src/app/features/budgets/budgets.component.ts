import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BudgetService } from '../../core/services/budget.service';
import { CategoryService } from '../../core/services/category.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { Budget, Category } from '../../core/models/transaction.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { BudgetDialogComponent } from './budget-dialog.component';
import { MONTHS, yearOptions, monthLabel, getBudgetColor } from '../../core/utils/date.util';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatProgressBarModule,
    MatDialogModule, FormsModule, VeyroCurrencyPipe,
  ],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss',
})
export class BudgetsComponent implements OnInit, OnDestroy {
  protected readonly Math = Math;
  protected readonly getBudgetColor = getBudgetColor;

  private refresh = inject(DataRefreshService);
  private sub?: Subscription;

  loading = signal(true);
  budgets = signal<Budget[]>([]);
  expenseCategories = signal<Category[]>([]);

  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();

  months = MONTHS;
  years = yearOptions(5);

  constructor(
    private budgetService: BudgetService,
    private categoryService: CategoryService,
    private dialog: MatDialog
  ) {}

  get periodLabel(): string {
    return monthLabel(this.filterMonth, this.filterYear);
  }

  async ngOnInit(): Promise<void> {
    const cats = await this.categoryService.getCategories('expense');
    this.expenseCategories.set(cats);
    await this.loadBudgets();
    this.sub = this.refresh.refresh$.subscribe(() => this.loadBudgets());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async loadBudgets(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.budgetService.getBudgets(this.filterMonth, this.filterYear);
      this.budgets.set(data);
    } catch (err) {
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  openDialog(budget?: Budget): void {
    const ref = this.dialog.open(BudgetDialogComponent, {
      width: '400px',
      data: { budget, categories: this.expenseCategories() },
    });

    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.budgetService.upsertBudget({
          id: budget?.id,
          category_id: result.categoryId,
          amount: result.amount,
          month: this.filterMonth,
          year: this.filterYear,
        });
        this.refresh.notify('budget');
        await this.loadBudgets();
      } catch (err) {
        console.error(err);
      }
    });
  }

  async deleteBudget(budget: Budget): Promise<void> {
    if (!confirm('Remove this budget?')) return;
    try {
      await this.budgetService.deleteBudget(budget.id);
      this.refresh.notify('budget');
      await this.loadBudgets();
    } catch (err) {
      console.error(err);
    }
  }

  get totalBudget(): number {
    return this.budgets().reduce((sum, b) => sum + b.amount, 0);
  }

  get totalSpent(): number {
    return this.budgets().reduce((sum, b) => sum + (b.spent ?? 0), 0);
  }

  get remaining(): number {
    return this.totalBudget - this.totalSpent;
  }
}

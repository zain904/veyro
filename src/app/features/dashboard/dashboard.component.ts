import { Component, OnInit, signal, effect, inject, HostListener, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { TransactionService } from '../../core/services/transaction.service';
import { BudgetService } from '../../core/services/budget.service';
import { ChartBuilderService } from '../../core/services/chart-builder.service';
import { ThemeService } from '../../core/services/theme.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { Transaction, Budget } from '../../core/models/transaction.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { ApexOptions } from 'apexcharts';
import {
  MONTHS, yearOptions, monthLabel, previousPeriod,
  formatRelativeDate, getBudgetColor, calcPercentChange,
} from '../../core/utils/date.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatCardModule, MatIconModule, MatProgressBarModule, MatButtonModule,
    MatFormFieldModule, MatSelectModule, FormsModule, RouterLink,
    VeyroCurrencyPipe, ChartComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  protected readonly Math = Math;
  protected readonly getBudgetColor = getBudgetColor;

  private chartBuilder = inject(ChartBuilderService);
  private themeService = inject(ThemeService);
  private refresh = inject(DataRefreshService);
  private sub?: Subscription;
  private dataLoaded = false;

  loading = signal(true);
  totalIncome = signal(0);
  totalExpenses = signal(0);
  balance = signal(0);
  savingsRate = signal(0);
  incomeChange = signal(0);
  expenseChange = signal(0);
  netChange = signal(0);
  recentTransactions = signal<Transaction[]>([]);
  budgets = signal<Budget[]>([]);
  expenseChartOptions = signal<ApexOptions | null>(null);
  cashFlowChartOptions = signal<ApexOptions | null>(null);
  dailyChartOptions = signal<ApexOptions | null>(null);

  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();
  months = MONTHS;
  years = yearOptions(5);

  constructor(
    private transactionService: TransactionService,
    private budgetService: BudgetService
  ) {
    effect(() => {
      this.themeService.theme();
      if (this.dataLoaded) this.loadDashboard(false);
    });
  }

  get periodLabel(): string {
    return monthLabel(this.filterMonth, this.filterYear);
  }

  ngOnInit(): void {
    this.loadDashboard(true);
    this.sub = this.refresh.refresh$.subscribe(() => this.loadDashboard(false));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.dataLoaded) this.loadDashboard(false);
  }

  changeLabel(value: number, invert = false): { text: string; positive: boolean } {
    const improved = invert ? value <= 0 : value >= 0;
    return {
      text: `${value >= 0 ? '+' : ''}${value}%`,
      positive: improved,
    };
  }

  async loadDashboard(showLoader = true): Promise<void> {
    if (showLoader) this.loading.set(true);
    try {
      const prev = previousPeriod(this.filterMonth, this.filterYear);

      const [stats, prevStats, recent, categoryExpenses, budgets, dailySpending] = await Promise.all([
        this.transactionService.getMonthlyStats(this.filterMonth, this.filterYear),
        this.transactionService.getMonthlyStats(prev.month, prev.year),
        this.transactionService.getRecentTransactions(5, this.filterMonth, this.filterYear),
        this.transactionService.getExpensesByCategory(this.filterMonth, this.filterYear),
        this.budgetService.getBudgets(this.filterMonth, this.filterYear),
        this.transactionService.getDailySpending(this.filterMonth, this.filterYear),
      ]);

      const net = stats.income - stats.expenses;
      const prevNet = prevStats.income - prevStats.expenses;

      this.totalIncome.set(stats.income);
      this.totalExpenses.set(stats.expenses);
      this.balance.set(net);
      this.savingsRate.set(stats.income > 0 ? Math.round((net / stats.income) * 1000) / 10 : 0);
      this.incomeChange.set(calcPercentChange(stats.income, prevStats.income));
      this.expenseChange.set(calcPercentChange(stats.expenses, prevStats.expenses));
      this.netChange.set(calcPercentChange(net, prevNet));
      this.recentTransactions.set(recent);
      this.budgets.set(budgets.slice(0, 4));

      this.expenseChartOptions.set(this.chartBuilder.expenseDonutChart(categoryExpenses));
      this.cashFlowChartOptions.set(this.chartBuilder.cashFlowBarChart(stats.income, stats.expenses));
      this.dailyChartOptions.set(this.chartBuilder.dailySpendingChart(dailySpending));
      this.dataLoaded = true;
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      if (showLoader) this.loading.set(false);
    }
  }

  formatDate = formatRelativeDate;
}

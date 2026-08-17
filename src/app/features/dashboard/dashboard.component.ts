import { Component, OnInit, signal, effect, inject, HostListener, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TransactionService } from '../../core/services/transaction.service';
import { BudgetService } from '../../core/services/budget.service';
import { ChartBuilderService } from '../../core/services/chart-builder.service';
import { ThemeService } from '../../core/services/theme.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { ProfileService } from '../../core/services/profile.service';
import { CurrencyService } from '../../core/services/currency.service';
import { LanguageService } from '../../core/services/language.service';
import { Transaction, Budget } from '../../core/models/transaction.model';
import { MetricChange, buildChange } from '../../core/models/report.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { UserAvatarComponent } from '../../shared/components/user-avatar/user-avatar.component';
import { TransactionDialogComponent } from '../transactions/transaction-dialog/transaction-dialog.component';
import { ApexOptions } from 'apexcharts';
import {
  MONTHS, yearOptions, monthLabel, previousPeriod,
  formatRelativeDate, getBudgetColor,
} from '../../core/utils/date.util';

const PERIOD_STORAGE_KEY = 'veyro-dashboard-period';

export interface DashboardInsight {
  icon: string;
  title: string;
  message: string;
  tone: 'neutral' | 'positive' | 'warning' | 'danger';
  route?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatCardModule, MatIconModule, MatProgressBarModule, MatButtonModule,
    MatFormFieldModule, MatSelectModule, MatDialogModule, FormsModule,
    RouterLink, VeyroCurrencyPipe, ChartComponent, EmptyStateComponent, UserAvatarComponent,
    TranslatePipe,
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
  private profileService = inject(ProfileService);
  private currencyService = inject(CurrencyService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private lang = inject(LanguageService);
  private translate = inject(TranslateService);
  private sub?: Subscription;
  private langSub?: Subscription;
  private dataLoaded = false;

  loading = signal(true);
  error = signal<string | null>(null);
  hasAnyData = signal(true);
  displayName = signal('');
  avatarUrl = signal<string | null>(null);
  userEmail = signal<string | null>(null);
  totalIncome = signal(0);
  totalExpenses = signal(0);
  balance = signal(0);
  savingsRate = signal(0);
  incomeChange = signal<MetricChange | null>(null);
  expenseChange = signal<MetricChange | null>(null);
  netChange = signal<MetricChange | null>(null);
  savingsChange = signal<MetricChange | null>(null);
  recentTransactions = signal<Transaction[]>([]);
  recentAllTime = signal<Transaction[]>([]);
  budgets = signal<Budget[]>([]);
  budgetAlerts = signal<Budget[]>([]);
  insights = signal<DashboardInsight[]>([]);
  expenseChartOptions = signal<ApexOptions | null>(null);
  trendChartOptions = signal<ApexOptions | null>(null);
  dailyChartOptions = signal<ApexOptions | null>(null);
  savingsGaugeOptions = signal<ApexOptions | null>(null);
  totalBudget = signal(0);
  totalBudgetSpent = signal(0);
  totalBudgetRemaining = signal(0);
  allBudgetsCount = signal(0);

  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();
  activeQuickFilter = signal<'this-month' | 'last-month' | 'custom'>('this-month');
  months = MONTHS;
  years = yearOptions(5);

  constructor(
    private transactionService: TransactionService,
    private budgetService: BudgetService
  ) {
    this.restorePeriod();
    effect(() => {
      this.themeService.theme();
      if (this.dataLoaded) this.loadDashboard(false);
    });
  }

  get periodLabel(): string {
    return monthLabel(this.filterMonth, this.filterYear, this.lang.currentLang());
  }

  getMonthLabel(month: number, short = false): string {
    return monthLabel(month, this.filterYear, this.lang.currentLang(), short);
  }

  get greeting(): string {
    const hour = new Date().getHours();
    const key = hour < 12
      ? 'dashboard.greetingMorning'
      : hour < 17
        ? 'dashboard.greetingAfternoon'
        : 'dashboard.greetingEvening';
    const time = this.lang.instant(key);
    const name = this.displayName();
    return name ? `${time}, ${name.split(' ')[0]}` : time;
  }

  get monthHasActivity(): boolean {
    return this.totalIncome() > 0 || this.totalExpenses() > 0;
  }

  ngOnInit(): void {
    this.loadProfileView();
    this.loadDashboard(true);
    this.sub = this.refresh.refresh$.subscribe(reason => {
      if (reason === 'profile') this.loadProfileView();
      this.loadDashboard(false);
    });
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.loadDashboard(false);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.langSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.dataLoaded) this.loadDashboard(false);
  }

  applyQuickFilter(filter: 'this-month' | 'last-month'): void {
    const now = new Date();
    if (filter === 'this-month') {
      this.filterMonth = now.getMonth() + 1;
      this.filterYear = now.getFullYear();
    } else {
      const prev = previousPeriod(now.getMonth() + 1, now.getFullYear());
      this.filterMonth = prev.month;
      this.filterYear = prev.year;
    }
    this.activeQuickFilter.set(filter);
    this.persistPeriod();
    this.loadDashboard();
  }

  onPeriodChange(): void {
    this.activeQuickFilter.set('custom');
    this.persistPeriod();
    this.loadDashboard();
  }

  openAddTransaction(): void {
    const ref = this.dialog.open(TransactionDialogComponent, {
      width: '440px',
      data: {},
    });

    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.transactionService.createTransaction(result);
        this.refresh.notify('transaction');
        await this.loadDashboard(false);
      } catch (err) {
        console.error(err);
      }
    });
  }

  openEditTransaction(tx: Transaction): void {
    const ref = this.dialog.open(TransactionDialogComponent, {
      width: '440px',
      data: { transaction: tx },
    });

    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.transactionService.updateTransaction(tx.id, result);
        this.refresh.notify('transaction');
        await this.loadDashboard(false);
      } catch (err) {
        console.error(err);
      }
    });
  }

  navigateToTransactions(type?: 'income' | 'expense'): void {
    this.router.navigate(['/transactions'], {
      queryParams: {
        month: this.filterMonth,
        year: this.filterYear,
        ...(type ? { type } : {}),
      },
    });
  }

  async loadDashboard(showLoader = true): Promise<void> {
    if (showLoader) this.loading.set(true);
    this.error.set(null);
    try {
      const prev = previousPeriod(this.filterMonth, this.filterYear);

      const [
        anyData,
        stats,
        prevStats,
        recent,
        recentGlobal,
        categoryExpenses,
        budgets,
        dailySpending,
        trend,
      ] = await Promise.all([
        this.transactionService.hasAnyTransactions(),
        this.transactionService.getMonthlyStats(this.filterMonth, this.filterYear),
        this.transactionService.getMonthlyStats(prev.month, prev.year),
        this.transactionService.getRecentTransactions(5, this.filterMonth, this.filterYear),
        this.transactionService.getRecentTransactions(5),
        this.transactionService.getExpensesByCategory(this.filterMonth, this.filterYear),
        this.budgetService.getBudgets(this.filterMonth, this.filterYear),
        this.transactionService.getDailySpending(this.filterMonth, this.filterYear),
        this.transactionService.getMonthlyTrend(6),
      ]);

      this.hasAnyData.set(anyData);

      const net = stats.income - stats.expenses;
      const prevNet = prevStats.income - prevStats.expenses;
      const prevSavingsRate = prevStats.income > 0
        ? Math.round(((prevNet / prevStats.income) * 1000)) / 10
        : 0;
      const savingsRate = stats.income > 0 ? Math.round((net / stats.income) * 1000) / 10 : 0;

      this.totalIncome.set(stats.income);
      this.totalExpenses.set(stats.expenses);
      this.balance.set(net);
      this.savingsRate.set(savingsRate);
      this.incomeChange.set(buildChange(stats.income, prevStats.income));
      this.expenseChange.set(buildChange(stats.expenses, prevStats.expenses, true));
      this.netChange.set(buildChange(net, prevNet));
      this.savingsChange.set(buildChange(savingsRate, prevSavingsRate));
      this.recentTransactions.set(recent);
      this.recentAllTime.set(recentGlobal);
      this.budgets.set(budgets.slice(0, 4));
      this.allBudgetsCount.set(budgets.length);
      this.budgetAlerts.set(budgets.filter(b => (b.percentage ?? 0) >= 90));

      const budgetTotal = budgets.reduce((s, b) => s + b.amount, 0);
      const budgetSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
      this.totalBudget.set(budgetTotal);
      this.totalBudgetSpent.set(budgetSpent);
      this.totalBudgetRemaining.set(budgetTotal - budgetSpent);

      this.insights.set(this.buildInsights(categoryExpenses, budgets, stats, prevStats));
      this.expenseChartOptions.set(this.chartBuilder.expenseDonutChart(categoryExpenses));
      this.trendChartOptions.set(this.chartBuilder.trendAreaChart(trend));
      this.dailyChartOptions.set(this.chartBuilder.dailySpendingChart(dailySpending));
      this.savingsGaugeOptions.set(
        stats.income > 0 || stats.expenses > 0
          ? this.chartBuilder.savingsGaugeChart(savingsRate)
          : null
      );
      this.dataLoaded = true;
    } catch (err) {
      console.error('Failed to load dashboard', err);
      this.error.set(this.lang.instant('dashboard.errorMessage'));
    } finally {
      if (showLoader) this.loading.set(false);
    }
  }

  private buildInsights(
    categories: { name: string; amount: number; color: string }[],
    budgets: Budget[],
    stats: { income: number; expenses: number },
    prevStats: { income: number; expenses: number }
  ): DashboardInsight[] {
    const items: DashboardInsight[] = [];

    if (categories.length > 0) {
      const top = categories[0];
      items.push({
        icon: 'local_fire_department',
        title: this.lang.instant('dashboard.insightTopExpense'),
        message: `${top.name} — ${this.currencyService.format(top.amount)}`,
        tone: 'neutral',
        route: '/categories',
      });
    }

    const expenseChange = buildChange(stats.expenses, prevStats.expenses, true);
    if (expenseChange) {
      items.push({
        icon: expenseChange.positive ? 'trending_down' : 'trending_up',
        title: this.lang.instant('dashboard.insightSpendingTrend'),
        message: this.lang.instant('dashboard.insightVsLastMonth', { change: expenseChange.label }),
        tone: expenseChange.positive ? 'positive' : 'warning',
        route: '/reports',
      });
    }

    const overBudget = budgets.find(b => (b.percentage ?? 0) > 100);
    const nearBudget = budgets.find(b => (b.percentage ?? 0) >= 90 && (b.percentage ?? 0) <= 100);
    if (overBudget) {
      items.push({
        icon: 'warning',
        title: this.lang.instant('dashboard.insightBudgetExceeded'),
        message: this.lang.instant('dashboard.insightAtPercent', {
          name: overBudget.category?.name,
          percent: overBudget.percentage,
        }),
        tone: 'danger',
        route: '/budgets',
      });
    } else if (nearBudget) {
      items.push({
        icon: 'info',
        title: this.lang.instant('dashboard.insightBudgetAlert'),
        message: this.lang.instant('dashboard.insightAtPercent', {
          name: nearBudget.category?.name,
          percent: nearBudget.percentage,
        }),
        tone: 'warning',
        route: '/budgets',
      });
    }

    if (stats.income > stats.expenses && stats.income > 0) {
      items.push({
        icon: 'savings',
        title: this.lang.instant('dashboard.insightYouSaved'),
        message: this.lang.instant('dashboard.insightSavedThisMonth', {
          amount: this.currencyService.format(stats.income - stats.expenses),
        }),
        tone: 'positive',
      });
    } else if (stats.expenses > stats.income && stats.expenses > 0) {
      items.push({
        icon: 'report',
        title: this.lang.instant('dashboard.insightOverspent'),
        message: this.lang.instant('dashboard.insightOverspentBy', {
          amount: this.currencyService.format(stats.expenses - stats.income),
        }),
        tone: 'danger',
        route: '/reports',
      });
    }

    return items.slice(0, 4);
  }

  private async loadProfileView(): Promise<void> {
    try {
      const view = await this.profileService.getProfileView();
      if (view) {
        this.displayName.set(view.fullName);
        this.avatarUrl.set(view.avatarUrl);
        this.userEmail.set(view.email);
      }
    } catch {
      /* ignore */
    }
  }

  private persistPeriod(): void {
    localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify({
      month: this.filterMonth,
      year: this.filterYear,
    }));
  }

  private restorePeriod(): void {
    try {
      const raw = localStorage.getItem(PERIOD_STORAGE_KEY);
      if (!raw) return;
      const { month, year } = JSON.parse(raw);
      if (month && year) {
        this.filterMonth = month;
        this.filterYear = year;
        const now = new Date();
        if (month === now.getMonth() + 1 && year === now.getFullYear()) {
          this.activeQuickFilter.set('this-month');
        } else {
          const prev = previousPeriod(now.getMonth() + 1, now.getFullYear());
          if (month === prev.month && year === prev.year) {
            this.activeQuickFilter.set('last-month');
          } else {
            this.activeQuickFilter.set('custom');
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  formatDate = (dateStr: string) => formatRelativeDate(dateStr, this.lang.currentLang());
}

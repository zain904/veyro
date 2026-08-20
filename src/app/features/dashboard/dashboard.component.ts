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
import { ToastService } from '../../core/services/toast.service';
import { AccountService } from '../../core/services/account.service';
import { Account, Transaction, Budget } from '../../core/models/transaction.model';
import { MetricChange, buildChange } from '../../core/models/report.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { UserAvatarComponent } from '../../shared/components/user-avatar/user-avatar.component';
import { TransactionDialogComponent } from '../transactions/transaction-dialog/transaction-dialog.component';
import { DashboardQuickAddComponent } from './dashboard-quick-add.component';
import { ApexOptions } from 'apexcharts';
import {
  MONTHS, yearOptions, monthLabel, previousPeriod,
  formatRelativeDate, getBudgetColor,
} from '../../core/utils/date.util';
import {
  HealthStatus, BudgetForecast, CompletenessHint,
  computeSafeToSpend, computeHealthStatus, buildBudgetForecasts,
  buildMonthSummary, sortBudgetsByUrgency, daysRemainingInPeriod,
} from '../../core/utils/dashboard-intelligence.util';
import { CategoryChartItem } from '../../core/services/chart-builder.service';

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
    DashboardQuickAddComponent, TranslatePipe,
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
  private toast = inject(ToastService);
  private accountService = inject(AccountService);
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
  safeToSpend = signal(0);
  todaySpend = signal(0);
  healthStatus = signal<HealthStatus>('good');
  monthSummary = signal<{ key: string; params?: Record<string, unknown> } | null>(null);
  completenessHints = signal<CompletenessHint[]>([]);
  budgetForecasts = signal<BudgetForecast[]>([]);
  lastUpdated = signal<Date | null>(null);
  savingsGoalTarget = signal(0);
  monthlySavingsSaved = signal(0);
  expenseCategories = signal<CategoryChartItem[]>([]);
  accounts = signal<Account[]>([]);
  totalAccountsBalance = signal(0);

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

  get daysRemaining(): number {
    return daysRemainingInPeriod(this.filterMonth, this.filterYear);
  }

  get healthStatusKey(): string {
    const map: Record<HealthStatus, string> = {
      good: 'dashboard.statusGood',
      caution: 'dashboard.statusCaution',
      danger: 'dashboard.statusDanger',
    };
    return map[this.healthStatus()];
  }

  get healthStatusIcon(): string {
    const map: Record<HealthStatus, string> = {
      good: 'check_circle',
      caution: 'warning_amber',
      danger: 'error',
    };
    return map[this.healthStatus()];
  }

  get savingsGoalSaved(): number {
    return this.monthlySavingsSaved();
  }

  get savingsGoalPercent(): number {
    const target = this.savingsGoalTarget();
    if (target <= 0) return 0;
    return Math.min(100, Math.round((this.savingsGoalSaved / target) * 100));
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
    // Charts resize via ResizeObserver — no data refetch needed.
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
        this.toast.error('errors.saveFailed');
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
        this.toast.error('errors.saveFailed');
      }
    });
  }

  navigateToTransactions(type?: 'income' | 'expense', categoryId?: string): void {
    this.router.navigate(['/transactions'], {
      queryParams: {
        month: this.filterMonth,
        year: this.filterYear,
        ...(type ? { type } : {}),
        ...(categoryId ? { category: categoryId } : {}),
      },
    });
  }

  onExpenseChartClick(event: { seriesIndex: number; dataPointIndex: number }): void {
    const cat = this.expenseCategories()[event.dataPointIndex];
    if (cat?.id) {
      this.navigateToTransactions('expense', cat.id);
    }
  }

  onQuickAddDone(): void {
    this.loadDashboard(false);
  }

  refreshDashboard(): void {
    this.loadDashboard(false);
  }

  formatLastUpdated(): string {
    const d = this.lastUpdated();
    if (!d) return '';
    return d.toLocaleTimeString(this.lang.currentLang(), { hour: '2-digit', minute: '2-digit' });
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
        todayExpenses,
        hasIncome,
        daysSinceLast,
        accountsWithBalances,
      ] = await Promise.all([
        this.transactionService.hasAnyTransactions(),
        this.transactionService.getMonthlyStats(this.filterMonth, this.filterYear),
        this.transactionService.getMonthlyStats(prev.month, prev.year),
        this.transactionService.getRecentTransactions(5, this.filterMonth, this.filterYear),
        this.transactionService.getRecentTransactions(5),
        this.transactionService.getExpensesByCategory(this.filterMonth, this.filterYear),
        this.budgetService.getBudgets(this.filterMonth, this.filterYear),
        this.transactionService.getDailySpending(this.filterMonth, this.filterYear),
        this.transactionService.getMonthlyTrend(6, this.lang.currentLang()),
        this.transactionService.getTodayExpenses(),
        this.transactionService.hasIncomeInMonth(this.filterMonth, this.filterYear),
        this.transactionService.getDaysSinceLastTransaction(),
        this.accountService.getAccountsWithBalances(),
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
      this.expenseCategories.set(categoryExpenses);
      this.accounts.set(accountsWithBalances);
      this.totalAccountsBalance.set(accountsWithBalances.reduce((s, a) => s + (a.balance ?? 0), 0));
      this.budgets.set(sortBudgetsByUrgency(budgets).slice(0, 4));
      this.allBudgetsCount.set(budgets.length);
      this.budgetAlerts.set(budgets.filter(b => (b.percentage ?? 0) >= 90));

      const budgetTotal = budgets.reduce((s, b) => s + b.amount, 0);
      const budgetSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
      const budgetRemaining = budgetTotal - budgetSpent;
      this.totalBudget.set(budgetTotal);
      this.totalBudgetSpent.set(budgetSpent);
      this.totalBudgetRemaining.set(budgetRemaining);

      this.todaySpend.set(todayExpenses);
      this.safeToSpend.set(computeSafeToSpend(budgetTotal, budgetRemaining, net));
      this.healthStatus.set(computeHealthStatus(
        net, budgetTotal, budgetRemaining, this.budgetAlerts().length,
        stats.income, stats.expenses
      ));

      const expenseChangeVal = buildChange(stats.expenses, prevStats.expenses, true);
      this.monthSummary.set(buildMonthSummary(
        expenseChangeVal,
        categoryExpenses[0]?.name ?? null,
        net,
        n => this.currencyService.format(n)
      ));

      this.monthlySavingsSaved.set(
        stats.income > 0 ? Math.max(0, stats.income - stats.expenses) : 0
      );
      this.completenessHints.set(this.buildCompletenessHints(
        hasIncome, daysSinceLast, budgets.length, this.savingsGoalTarget()
      ));
      this.budgetForecasts.set(buildBudgetForecasts(budgets, this.filterMonth, this.filterYear));
      this.lastUpdated.set(new Date());

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
    categories: CategoryChartItem[],
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

  private buildCompletenessHints(
    hasIncome: boolean,
    daysSince: number | null,
    budgetsCount: number,
    savingsGoal: number
  ): CompletenessHint[] {
    const hints: CompletenessHint[] = [];

    if (!hasIncome) {
      hints.push({
        icon: 'payments',
        messageKey: 'dashboard.hintNoIncome',
        route: '/transactions',
        tone: 'warning',
      });
    }

    if (daysSince !== null && daysSince >= 3) {
      hints.push({
        icon: 'event_busy',
        messageKey: 'dashboard.hintNoActivity',
        params: { days: daysSince },
        tone: 'info',
      });
    }

    if (budgetsCount === 0) {
      hints.push({
        icon: 'account_balance_wallet',
        messageKey: 'dashboard.hintNoBudgets',
        route: '/budgets',
        tone: 'info',
      });
    }

    if (savingsGoal <= 0) {
      hints.push({
        icon: 'flag',
        messageKey: 'dashboard.hintSetGoal',
        route: '/settings',
        tone: 'info',
      });
    }

    return hints.slice(0, 3);
  }

  private async loadProfileView(): Promise<void> {
    try {
      const view = await this.profileService.getProfileView();
      if (view) {
        this.displayName.set(view.fullName);
        this.avatarUrl.set(view.avatarUrl);
        this.userEmail.set(view.email);
      }
      const profile = await this.profileService.getProfile();
      this.savingsGoalTarget.set(profile?.savings_goal_target ?? 0);
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

import { Component, OnInit, signal, effect, inject, HostListener, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChartBuilderService, CategoryChartItem } from '../../core/services/chart-builder.service';
import { ReportsService, ReportsData } from '../../core/services/reports.service';
import { ThemeService } from '../../core/services/theme.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { LanguageService } from '../../core/services/language.service';
import { MetricChange, QuickFilter } from '../../core/models/report.model';
import { Transaction } from '../../core/models/transaction.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { ApexOptions } from 'apexcharts';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { MONTHS, yearOptions, monthLabel, formatShortDate } from '../../core/utils/date.util';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatInputModule, FormsModule, RouterLink,
    VeyroCurrencyPipe, ChartComponent, DecimalPipe, EmptyStateComponent, TranslatePipe,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit, OnDestroy {
  private chartBuilder = inject(ChartBuilderService);
  private reportsService = inject(ReportsService);
  private themeService = inject(ThemeService);
  private refresh = inject(DataRefreshService);
  private lang = inject(LanguageService);
  private translate = inject(TranslateService);
  private sub?: Subscription;
  private langSub?: Subscription;
  private dataLoaded = false;
  private reportData: ReportsData | null = null;

  loading = signal(true);
  error = signal<string | null>(null);
  reportMode = signal<'month' | 'year' | 'custom'>('month');
  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();
  activeQuickFilter = signal<QuickFilter>('this-month');
  trendMonths = 6;
  showCustomRange = signal(false);
  customStart = '';
  customEnd = '';

  summary = signal<ReportsData['summary'] | null>(null);
  insights = signal<ReportsData['insights'] | null>(null);
  expenseCategories = signal<CategoryChartItem[]>([]);
  recentTransactions = signal<Transaction[]>([]);

  groupedBarOptions = signal<ApexOptions | null>(null);
  donutOptions = signal<ApexOptions | null>(null);
  topCategoriesOptions = signal<ApexOptions | null>(null);
  cashFlowOptions = signal<ApexOptions | null>(null);

  months = MONTHS.map(m => ({ value: m.value, label: m.short }));
  years = yearOptions(5);

  quickFilters: { id: QuickFilter; labelKey: string }[] = [
    { id: 'this-month', labelKey: 'reports.thisMonth' },
    { id: 'last-month', labelKey: 'reports.lastMonth' },
    { id: 'this-year', labelKey: 'reports.thisYear' },
    { id: 'last-6-months', labelKey: 'reports.last6Months' },
    { id: 'custom', labelKey: 'reports.custom' },
  ];

  constructor() {
    effect(() => {
      this.themeService.theme();
      if (this.dataLoaded) this.applyCharts();
    });
  }

  get periodLabel(): string {
    if (this.reportData?.periodLabel) return this.reportData.periodLabel;
    if (this.reportMode() === 'year') return String(this.filterYear);
    return monthLabel(this.filterMonth, this.filterYear, this.lang.currentLang());
  }

  getMonthLabel(month: number): string {
    return monthLabel(month, this.filterYear, this.lang.currentLang(), true);
  }

  get compareLabel(): string {
    return this.lang.instant('dashboard.vsLastMonth');
  }

  get trendLabel(): string {
    if (this.reportMode() === 'year') return String(this.filterYear);
    return `${this.trendMonths}-month`;
  }

  get totalExpenses(): number {
    return this.summary()?.expenses ?? 0;
  }

  ngOnInit(): void {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    this.customStart = monthStart.toISOString().slice(0, 10);
    this.customEnd = now.toISOString().slice(0, 10);
    this.applyQuickFilter('this-month', false);
    this.loadReports(true);
    this.sub = this.refresh.refresh$.subscribe(() => this.loadReports(false));
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.loadReports(false);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.langSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.dataLoaded) this.applyCharts();
  }

  hasNoData(): boolean {
    const s = this.summary();
    const i = this.insights();
    if (!s || !i) return false;
    return s.income === 0 && s.expenses === 0 && i.transactionCount === 0;
  }

  applyQuickFilter(filter: QuickFilter, reload = true): void {
    this.activeQuickFilter.set(filter);
    this.showCustomRange.set(filter === 'custom');
    const now = new Date();

    switch (filter) {
      case 'this-month':
        this.reportMode.set('month');
        this.filterMonth = now.getMonth() + 1;
        this.filterYear = now.getFullYear();
        this.trendMonths = 6;
        break;
      case 'last-month': {
        this.reportMode.set('month');
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        this.filterMonth = d.getMonth() + 1;
        this.filterYear = d.getFullYear();
        this.trendMonths = 6;
        break;
      }
      case 'this-year':
        this.reportMode.set('year');
        this.filterMonth = now.getMonth() + 1;
        this.filterYear = now.getFullYear();
        this.trendMonths = 12;
        break;
      case 'last-6-months':
        this.reportMode.set('month');
        this.filterMonth = now.getMonth() + 1;
        this.filterYear = now.getFullYear();
        this.trendMonths = 6;
        break;
      case 'custom':
        this.reportMode.set('custom');
        return;
    }

    if (reload) this.loadReports();
  }

  applyCustomRange(): void {
    if (!this.customStart || !this.customEnd) return;
    if (this.customStart > this.customEnd) {
      this.error.set('Start date must be before end date.');
      return;
    }
    this.reportMode.set('custom');
    this.activeQuickFilter.set('custom');
    this.loadReports();
  }

  onPeriodChange(): void {
    this.reportMode.set('month');
    this.showCustomRange.set(false);
    this.loadReports();
  }

  async loadReports(showLoader = true): Promise<void> {
    if (showLoader) {
      this.loading.set(true);
      this.error.set(null);
    }
    try {
      const mode = this.reportMode();
      const customRange = mode === 'custom'
        ? { startDate: this.customStart, endDate: this.customEnd }
        : undefined;

      this.reportData = await this.reportsService.loadReports(
        this.filterMonth,
        this.filterYear,
        this.trendMonths,
        mode,
        customRange
      );

      this.summary.set(this.reportData.summary);
      this.insights.set(this.reportData.insights);
      this.expenseCategories.set(this.reportData.expenseCategories);
      this.recentTransactions.set(this.reportData.recentTransactions);
      this.applyCharts();
      this.dataLoaded = true;
    } catch (err) {
      console.error(err);
      this.error.set(this.lang.instant('dashboard.errorMessage'));
    } finally {
      if (showLoader) this.loading.set(false);
    }
  }

  private applyCharts(): void {
    if (!this.reportData) return;
    const { trend, expenseCategories } = this.reportData;

    this.groupedBarOptions.set(this.chartBuilder.incomeExpenseGroupedBarChart(trend));
    this.donutOptions.set(this.chartBuilder.expenseDonutChart(expenseCategories));
    this.topCategoriesOptions.set(
      expenseCategories.length
        ? this.chartBuilder.categoryBarChart(expenseCategories.slice(0, 6), true)
        : null
    );
    this.cashFlowOptions.set(this.chartBuilder.cashFlowNetChart(trend));
  }

  exportReport(): void {
    if (this.reportData) {
      this.reportsService.exportCsv(this.reportData, this.filterMonth, this.filterYear);
    }
  }

  formatDate = (dateStr: string) => formatShortDate(dateStr, this.lang.currentLang());

  categoryPercent(amount: number): number {
    const total = this.expenseCategories().reduce((s, c) => s + c.amount, 0);
    return total > 0 ? Math.round((amount / total) * 100) : 0;
  }

  txCountChangeLabel(change: number): string | null {
    if (change === 0) return null;
    return `${change >= 0 ? '+' : ''}${change} ${this.compareLabel}`;
  }

  showChangeBadge(change: MetricChange | null): boolean {
    return change !== null && change.value > 0;
  }
}

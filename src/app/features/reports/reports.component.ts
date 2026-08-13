import { Component, OnInit, signal, effect, inject, HostListener, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChartBuilderService, CategoryChartItem } from '../../core/services/chart-builder.service';
import { ReportsService, ReportsData } from '../../core/services/reports.service';
import { ThemeService } from '../../core/services/theme.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { QuickFilter } from '../../core/models/report.model';
import { Transaction } from '../../core/models/transaction.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { ApexOptions } from 'apexcharts';
import { MONTHS, yearOptions, monthLabel, formatShortDate } from '../../core/utils/date.util';
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    FormsModule,
    VeyroCurrencyPipe,
    ChartComponent,
    DecimalPipe,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit, OnDestroy {
  private chartBuilder = inject(ChartBuilderService);
  private reportsService = inject(ReportsService);
  private themeService = inject(ThemeService);
  private refresh = inject(DataRefreshService);
  private sub?: Subscription;
  private dataLoaded = false;
  private reportData: ReportsData | null = null;

  loading = signal(true);
  reportMode = signal<'month' | 'year'>('month');
  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();
  activeQuickFilter = signal<QuickFilter>('this-month');
  trendMonths = 6;
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
  quickFilters: { id: QuickFilter; label: string }[] = [
    { id: 'this-month', label: 'This Month' },
    { id: 'last-month', label: 'Last Month' },
    { id: 'this-year', label: 'This Year' },
    { id: 'last-6-months', label: 'Last 6 Months' },
  ];

  constructor() {
    effect(() => {
      this.themeService.theme();
      if (this.dataLoaded) this.applyCharts();
    });
  }

  async ngOnInit(): Promise<void> {
    this.applyQuickFilter('this-month', false);
    await this.loadReports(true);
    this.sub = this.refresh.refresh$.subscribe(() => this.loadReports(false));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get periodLabel(): string {
    return this.reportMode() === 'year'
      ? String(this.filterYear)
      : monthLabel(this.filterMonth, this.filterYear);
  }
  @HostListener('window:resize')
  onResize(): void {
    if (this.dataLoaded) this.applyCharts();
  }

  applyQuickFilter(filter: QuickFilter, reload = true): void {
    this.activeQuickFilter.set(filter);
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
    }

    if (reload) this.loadReports();
  }

  onPeriodChange(): void {
    this.reportMode.set('month');
    this.activeQuickFilter.set('this-month');
    this.loadReports();
  }
  async loadReports(showLoader = true): Promise<void> {
    if (showLoader) this.loading.set(true);
    try {
      this.reportData = await this.reportsService.loadReports(
        this.filterMonth,
        this.filterYear,
        this.trendMonths,
        this.reportMode()
      );
      this.summary.set(this.reportData.summary);
      this.insights.set(this.reportData.insights);
      this.expenseCategories.set(this.reportData.expenseCategories);
      this.recentTransactions.set(this.reportData.recentTransactions);
      this.applyCharts();
      this.dataLoaded = true;
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) this.loading.set(false);
    }
  }

  private applyCharts(): void {
    if (!this.reportData) return;

    const { trend, expenseCategories } = this.reportData;

    this.groupedBarOptions.set(this.chartBuilder.incomeExpenseGroupedBarChart(trend));
    this.donutOptions.set(this.chartBuilder.expenseDonutChart(expenseCategories));
    this.topCategoriesOptions.set(this.chartBuilder.categoryBarChart(expenseCategories.slice(0, 6), true));
    this.cashFlowOptions.set(this.chartBuilder.cashFlowNetChart(trend));
  }

  exportReport(): void {
    if (this.reportData) {
      this.reportsService.exportCsv(this.reportData, this.filterMonth, this.filterYear);
    }
  }

  formatDate = formatShortDate;
  categoryPercent(amount: number): number {
    const total = this.expenseCategories().reduce((s, c) => s + c.amount, 0);
    return total > 0 ? Math.round((amount / total) * 100) : 0;
  }
}

import { Injectable } from '@angular/core';
import { TransactionService } from './transaction.service';
import { BudgetService } from './budget.service';
import { buildChange, ReportInsights, ReportSummary } from '../models/report.model';
import { Transaction } from '../models/transaction.model';
import { CategoryChartItem, TrendChartItem } from './chart-builder.service';
import { previousPeriod } from '../utils/date.util';

export type ReportMode = 'month' | 'year' | 'custom';

export interface ReportsData {
  summary: ReportSummary;
  insights: ReportInsights;
  trend: TrendChartItem[];
  expenseCategories: CategoryChartItem[];
  recentTransactions: Transaction[];
  mode: ReportMode;
  periodLabel?: string;
}

const RECENT_TX_LIMIT = 8;

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(
    private transactionService: TransactionService,
    private budgetService: BudgetService
  ) {}

  async loadReports(
    month: number,
    year: number,
    trendMonths = 6,
    mode: ReportMode = 'month',
    customRange?: { startDate: string; endDate: string }
  ): Promise<ReportsData> {
    if (mode === 'custom' && customRange) {
      return this.loadCustomReports(customRange.startDate, customRange.endDate, month, year);
    }
    if (mode === 'year') {
      return this.loadYearlyReports(year, month);
    }
    return this.loadMonthlyReports(month, year, trendMonths);
  }

  private async loadCustomReports(
    startDate: string,
    endDate: string,
    budgetMonth: number,
    budgetYear: number
  ): Promise<ReportsData> {
    const prev = this.transactionService.previousRange(startDate, endDate);
    const days = this.transactionService.daysInRange(startDate, endDate);
    const prevDays = this.transactionService.daysInRange(prev.startDate, prev.endDate);

    const [
      stats,
      prevStats,
      trend,
      expenseCategories,
      recentTransactions,
      txCount,
      prevTxCount,
      budgets,
    ] = await Promise.all([
      this.transactionService.getStatsForRange(startDate, endDate),
      this.transactionService.getStatsForRange(prev.startDate, prev.endDate),
      this.transactionService.getTrendForRange(startDate, endDate),
      this.transactionService.getExpensesByCategoryForRange(startDate, endDate),
      this.transactionService.getTransactions({ startDate, endDate }),
      this.getRangeTransactionCount(startDate, endDate),
      this.getRangeTransactionCount(prev.startDate, prev.endDate),
      this.budgetService.getBudgets(budgetMonth, budgetYear),
    ]);

    const avgDaily = stats.expenses / days;
    const prevAvgDaily = prevStats.expenses / prevDays;

    return {
      mode: 'custom',
      periodLabel: `${startDate} – ${endDate}`,
      ...this.buildReportPayload(
        stats,
        prevStats,
        avgDaily,
        prevAvgDaily,
        txCount,
        prevTxCount,
        budgets,
        trend,
        expenseCategories,
        recentTransactions.slice(0, RECENT_TX_LIMIT)
      ),
    };
  }

  private async loadMonthlyReports(month: number, year: number, trendMonths: number): Promise<ReportsData> {
    const prev = previousPeriod(month, year);

    const [
      stats,
      prevStats,
      trend,
      expenseCategories,
      recentTransactions,
      txCount,
      prevTxCount,
      budgets,
    ] = await Promise.all([
      this.transactionService.getMonthlyStats(month, year),
      this.transactionService.getMonthlyStats(prev.month, prev.year),
      this.transactionService.getMonthlyTrend(trendMonths),
      this.transactionService.getExpensesByCategory(month, year),
      this.transactionService.getTransactions({ month, year }),
      this.getTransactionCount(month, year),
      this.getTransactionCount(prev.month, prev.year),
      this.budgetService.getBudgets(month, year),
    ]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const prevDays = new Date(prev.year, prev.month, 0).getDate();
    const avgDaily = stats.expenses / daysInMonth;
    const prevAvgDaily = prevStats.expenses / prevDays;

    return {
      mode: 'month',
      ...this.buildReportPayload(stats, prevStats, avgDaily, prevAvgDaily, txCount, prevTxCount, budgets, trend, expenseCategories, recentTransactions.slice(0, RECENT_TX_LIMIT)),
    };
  }

  private async loadYearlyReports(year: number, month: number): Promise<ReportsData> {
    const prevYear = year - 1;
    const now = new Date();
    const daysInYear = year === now.getFullYear()
      ? Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000)
      : (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365);
    const prevDaysInYear = prevYear % 4 === 0 && (prevYear % 100 !== 0 || prevYear % 400 === 0) ? 366 : 365;

    const [
      stats,
      prevStats,
      trend,
      expenseCategories,
      recentTransactions,
      txCount,
      prevTxCount,
      budgets,
    ] = await Promise.all([
      this.transactionService.getYearlyStats(year),
      this.transactionService.getYearlyStats(prevYear),
      this.transactionService.getYearTrend(year),
      this.transactionService.getExpensesByCategoryForYear(year),
      this.transactionService.getTransactions({ year }),
      this.getYearlyTransactionCount(year),
      this.getYearlyTransactionCount(prevYear),
      this.budgetService.getBudgets(month, year),
    ]);

    const avgDaily = stats.expenses / daysInYear;
    const prevAvgDaily = prevStats.expenses / prevDaysInYear;

    return {
      mode: 'year',
      ...this.buildReportPayload(stats, prevStats, avgDaily, prevAvgDaily, txCount, prevTxCount, budgets, trend, expenseCategories, recentTransactions.slice(0, RECENT_TX_LIMIT)),
    };
  }

  private buildReportPayload(
    stats: { income: number; expenses: number },
    prevStats: { income: number; expenses: number },
    avgDaily: number,
    prevAvgDaily: number,
    txCount: number,
    prevTxCount: number,
    budgets: Awaited<ReturnType<BudgetService['getBudgets']>>,
    trend: TrendChartItem[],
    expenseCategories: CategoryChartItem[],
    recentTransactions: Transaction[]
  ): Omit<ReportsData, 'mode'> {
    const net = stats.income - stats.expenses;
    const prevNet = prevStats.income - prevStats.expenses;
    const savingsRate = stats.income > 0 ? Math.round((net / stats.income) * 1000) / 10 : 0;
    const prevSavingsRate = prevStats.income > 0 ? Math.round((prevNet / prevStats.income) * 1000) / 10 : 0;
    const highest = expenseCategories.length > 0 ? expenseCategories[0] : null;

    const billBudgets = budgets.filter(b =>
      b.category?.name?.toLowerCase().includes('bill') ||
      b.category?.icon === 'receipt_long'
    );
    const upcomingRemaining = billBudgets
      .map(b => Math.max(0, b.amount - (b.spent ?? 0)))
      .filter(v => v > 0);

    return {
      summary: {
        income: stats.income,
        expenses: stats.expenses,
        net,
        savingsRate,
        incomeChange: buildChange(stats.income, prevStats.income),
        expensesChange: buildChange(stats.expenses, prevStats.expenses, true),
        netChange: buildChange(net, prevNet),
        savingsChange: buildChange(savingsRate, prevSavingsRate),
      },
      insights: {
        transactionCount: txCount,
        transactionCountChange: txCount - prevTxCount,
        avgDailyExpense: Math.round(avgDaily),
        avgDailyChange: buildChange(avgDaily, prevAvgDaily, true),
        highestExpense: highest,
        upcomingBills: {
          count: upcomingRemaining.length || billBudgets.length,
          total: upcomingRemaining.reduce((s, v) => s + v, 0),
        },
      },
      trend,
      expenseCategories,
      recentTransactions,
    };
  }

  exportCsv(data: ReportsData, month: number, year: number): void {
    const period = data.periodLabel
      ?? (data.mode === 'year' ? `${year}` : `${month}/${year}`);
    const rows = [
      ['Veyro Report', period],
      [],
      ['Summary', 'Amount'],
      ['Income', data.summary.income],
      ['Expenses', data.summary.expenses],
      ['Net', data.summary.net],
      ['Savings Rate', `${data.summary.savingsRate}%`],
      [],
      ['Category', 'Amount'],
      ...data.expenseCategories.map(c => [c.name, c.amount]),
      [],
      ['Date', 'Category', 'Type', 'Amount', 'Description'],
      ...data.recentTransactions.map(t => [
        t.transaction_date,
        t.category?.name ?? '',
        t.type,
        t.amount,
        t.description ?? '',
      ]),
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.mode === 'year' ? `veyro-report-${year}.csv` : `veyro-report-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async getTransactionCount(month: number, year: number): Promise<number> {
    const txs = await this.transactionService.getTransactions({ month, year });
    return txs.length;
  }

  private async getRangeTransactionCount(startDate: string, endDate: string): Promise<number> {
    const txs = await this.transactionService.getTransactions({ startDate, endDate });
    return txs.length;
  }

  private async getYearlyTransactionCount(year: number): Promise<number> {
    const txs = await this.transactionService.getTransactions({ year });
    return txs.length;
  }
}

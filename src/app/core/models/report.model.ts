export interface MetricChange {
  value: number;
  label: string;
  positive: boolean;
}

export interface ReportInsights {
  transactionCount: number;
  transactionCountChange: number;
  avgDailyExpense: number;
  avgDailyChange: MetricChange | null;
  highestExpense: { name: string; amount: number; color: string } | null;
  upcomingBills: { count: number; total: number };
}

export interface ReportSummary {
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
  incomeChange: MetricChange | null;
  expensesChange: MetricChange | null;
  netChange: MetricChange | null;
  savingsChange: MetricChange | null;
}

export type QuickFilter = 'this-month' | 'last-month' | 'this-year' | 'last-6-months' | 'custom';

export function calcPercentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function buildChange(current: number, previous: number, invertPositive = false): MetricChange | null {
  const pct = calcPercentChange(current, previous);
  if (pct === null) return null;
  const improved = invertPositive ? pct <= 0 : pct >= 0;
  const arrow = pct >= 0 ? '↑' : '↓';
  return {
    value: Math.abs(pct),
    label: `${arrow} ${Math.abs(pct)}%`,
    positive: improved,
  };
}

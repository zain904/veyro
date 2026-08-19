import { Budget } from '../models/transaction.model';
import { buildChange } from '../models/report.model';

export type HealthStatus = 'good' | 'caution' | 'danger';

export interface BudgetForecast {
  categoryId: string;
  categoryName: string;
  daysUntilExceeded: number | null;
  alreadyExceeded: boolean;
  percentage: number;
}

export interface CompletenessHint {
  icon: string;
  messageKey: string;
  params?: Record<string, unknown>;
  route?: string;
  tone: 'info' | 'warning';
}

export function computeSafeToSpend(
  totalBudget: number,
  budgetRemaining: number,
  balance: number
): number {
  if (totalBudget > 0) return budgetRemaining;
  return balance;
}

export function computeHealthStatus(
  balance: number,
  totalBudget: number,
  budgetRemaining: number,
  budgetAlerts: number,
  income: number,
  expenses: number
): HealthStatus {
  if (totalBudget > 0 && budgetRemaining < 0) return 'danger';
  if (expenses > income && income > 0) return 'danger';
  if (balance < 0) return 'danger';
  if (budgetAlerts > 0 || (totalBudget > 0 && budgetRemaining < totalBudget * 0.15)) return 'caution';
  if (income === 0 && expenses > 0) return 'caution';
  return 'good';
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function daysElapsedInPeriod(month: number, year: number): number {
  const now = new Date();
  if (now.getMonth() + 1 === month && now.getFullYear() === year) {
    return Math.max(1, now.getDate());
  }
  return daysInMonth(month, year);
}

export function daysRemainingInPeriod(month: number, year: number): number {
  const total = daysInMonth(month, year);
  const elapsed = daysElapsedInPeriod(month, year);
  return Math.max(0, total - elapsed);
}

export function buildBudgetForecasts(
  budgets: Budget[],
  month: number,
  year: number
): BudgetForecast[] {
  const elapsed = daysElapsedInPeriod(month, year);

  return budgets
    .map(budget => {
      const spent = budget.spent ?? 0;
      const pct = budget.percentage ?? 0;
      const remaining = budget.amount - spent;
      const alreadyExceeded = pct > 100;

      if (alreadyExceeded) {
        return {
          categoryId: budget.category_id,
          categoryName: budget.category?.name ?? 'Category',
          daysUntilExceeded: 0,
          alreadyExceeded: true,
          percentage: pct,
        };
      }

      if (spent <= 0 || remaining <= 0) {
        return {
          categoryId: budget.category_id,
          categoryName: budget.category?.name ?? 'Category',
          daysUntilExceeded: null,
          alreadyExceeded: false,
          percentage: pct,
        };
      }

      const dailyRate = spent / elapsed;
      const daysUntilExceeded = dailyRate > 0 ? Math.ceil(remaining / dailyRate) : null;

      return {
        categoryId: budget.category_id,
        categoryName: budget.category?.name ?? 'Category',
        daysUntilExceeded,
        alreadyExceeded: false,
        percentage: pct,
      };
    })
    .filter(f => f.alreadyExceeded || (f.daysUntilExceeded !== null && f.daysUntilExceeded <= 14))
    .sort((a, b) => {
      if (a.alreadyExceeded && !b.alreadyExceeded) return -1;
      if (!a.alreadyExceeded && b.alreadyExceeded) return 1;
      return (a.daysUntilExceeded ?? 999) - (b.daysUntilExceeded ?? 999);
    })
    .slice(0, 3);
}

export function buildMonthSummary(
  expenseChange: ReturnType<typeof buildChange>,
  topCategoryName: string | null,
  balance: number,
  formatCurrency: (n: number) => string
): { key: string; params?: Record<string, unknown> } | null {
  if (expenseChange) {
    const direction = expenseChange.positive ? 'down' : 'up';
    if (topCategoryName) {
      return {
        key: `dashboard.summarySpending${direction === 'up' ? 'Up' : 'Down'}WithCategory`,
        params: { change: expenseChange.label, category: topCategoryName },
      };
    }
    return {
      key: `dashboard.summarySpending${direction === 'up' ? 'Up' : 'Down'}`,
      params: { change: expenseChange.label },
    };
  }

  if (balance > 0) {
    return {
      key: 'dashboard.summarySaved',
      params: { amount: formatCurrency(balance) },
    };
  }

  if (balance < 0) {
    return {
      key: 'dashboard.summaryOverspent',
      params: { amount: formatCurrency(Math.abs(balance)) },
    };
  }

  return { key: 'dashboard.summaryNeutral' };
}

export function sortBudgetsByUrgency(budgets: Budget[]): Budget[] {
  return [...budgets].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
}

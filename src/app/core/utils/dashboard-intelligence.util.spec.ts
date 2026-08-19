import {
  computeSafeToSpend,
  computeHealthStatus,
  buildBudgetForecasts,
  buildMonthSummary,
  sortBudgetsByUrgency,
  daysRemainingInPeriod,
} from './dashboard-intelligence.util';
import { Budget } from '../models/transaction.model';

describe('dashboard-intelligence.util', () => {
  it('computeSafeToSpend uses budget remaining when budgets exist', () => {
    expect(computeSafeToSpend(1000, 400, 500)).toBe(400);
  });

  it('computeSafeToSpend uses balance when no budgets', () => {
    expect(computeSafeToSpend(0, 0, 500)).toBe(500);
  });

  it('computeHealthStatus returns danger when over budget', () => {
    expect(computeHealthStatus(100, 1000, -50, 1, 500, 400)).toBe('danger');
  });

  it('computeHealthStatus returns good when healthy', () => {
    expect(computeHealthStatus(500, 1000, 600, 0, 1000, 400)).toBe('good');
  });

  it('buildMonthSummary returns saved message for positive balance', () => {
    const result = buildMonthSummary(null, null, 200, n => `$${n}`);
    expect(result?.key).toBe('dashboard.summarySaved');
  });

  it('sortBudgetsByUrgency sorts by percentage descending', () => {
    const budgets = [
      { percentage: 50 } as Budget,
      { percentage: 90 } as Budget,
      { percentage: 70 } as Budget,
    ];
    const sorted = sortBudgetsByUrgency(budgets);
    expect(sorted.map(b => b.percentage)).toEqual([90, 70, 50]);
  });

  it('daysRemainingInPeriod returns days left in current month', () => {
    const now = new Date();
    const remaining = daysRemainingInPeriod(now.getMonth() + 1, now.getFullYear());
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  it('buildBudgetForecasts flags exceeded budgets', () => {
    const budgets = [{
      category_id: '1',
      category: { name: 'Food' },
      amount: 100,
      spent: 150,
      percentage: 150,
    } as Budget];
    const forecasts = buildBudgetForecasts(budgets, new Date().getMonth() + 1, new Date().getFullYear());
    expect(forecasts[0].alreadyExceeded).toBeTrue();
  });
});

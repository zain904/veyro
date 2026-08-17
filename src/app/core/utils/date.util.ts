import { localeToBcp47, relativeDateLabels } from './locale.util';

export const MONTHS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

export function yearOptions(count = 5): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => current - i);
}

export function monthLabel(month: number, year: number, locale = 'en', short = false): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(localeToBcp47(locale), {
    month: short ? 'short' : 'long',
    year: 'numeric',
  });
}

export function previousPeriod(month: number, year: number): { month: number; year: number } {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

export function formatRelativeDate(dateStr: string, locale = 'en'): string {
  const date = new Date(dateStr);
  const today = new Date();
  const labels = relativeDateLabels(locale);
  const bcp47 = localeToBcp47(locale);

  if (date.toDateString() === today.toDateString()) {
    return labels.today;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return labels.yesterday;
  }

  return date.toLocaleDateString(bcp47, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(dateStr: string, locale = 'en'): string {
  return new Date(dateStr).toLocaleDateString(localeToBcp47(locale), { month: 'short', day: 'numeric' });
}

export function getBudgetColor(percentage: number): 'primary' | 'accent' | 'warn' {
  if (percentage >= 90) return 'warn';
  if (percentage >= 70) return 'accent';
  return 'primary';
}

export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

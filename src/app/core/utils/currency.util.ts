export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
  locale: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'PKR', label: 'Pakistani Rupee (PKR)', symbol: 'Rs.', locale: 'en-PK', decimals: 0 },
  { code: 'USD', label: 'US Dollar (USD)', symbol: '$', locale: 'en-US', decimals: 2 },
  { code: 'EUR', label: 'Euro (EUR)', symbol: '€', locale: 'de-DE', decimals: 2 },
  { code: 'GBP', label: 'British Pound (GBP)', symbol: '£', locale: 'en-GB', decimals: 2 },
  { code: 'AED', label: 'UAE Dirham (AED)', symbol: 'AED', locale: 'en-AE', decimals: 2 },
  { code: 'SAR', label: 'Saudi Riyal (SAR)', symbol: 'SAR', locale: 'ar-SA', decimals: 2 },
  { code: 'INR', label: 'Indian Rupee (INR)', symbol: '₹', locale: 'en-IN', decimals: 0 },
  { code: 'CAD', label: 'Canadian Dollar (CAD)', symbol: 'CA$', locale: 'en-CA', decimals: 2 },
  { code: 'AUD', label: 'Australian Dollar (AUD)', symbol: 'A$', locale: 'en-AU', decimals: 2 },
];

export const DEFAULT_CURRENCY = 'PKR';

export function getCurrencyOption(code: string): CurrencyOption {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) ?? SUPPORTED_CURRENCIES[0];
}

/** Locale-aware currency formatting used app-wide. */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode = DEFAULT_CURRENCY,
  options?: { showSign?: boolean; compact?: boolean }
): string {
  if (amount == null || Number.isNaN(amount)) {
    return formatCurrency(0, currencyCode, options);
  }

  const currency = getCurrencyOption(currencyCode);
  const abs = Math.abs(amount);

  if (options?.compact) {
    if (abs >= 1_000_000) return `${currency.symbol} ${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${currency.symbol} ${(abs / 1_000).toFixed(0)}k`;
  }

  const formatted = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(abs);

  const prefix = options?.showSign
    ? amount >= 0 ? '+ ' : '- '
    : amount < 0 ? '- ' : '';

  return `${prefix}${currency.symbol} ${formatted}`.replace(/\s+/g, ' ').trim();
}

export function currencyPrefix(currencyCode = DEFAULT_CURRENCY): string {
  return getCurrencyOption(currencyCode).symbol;
}

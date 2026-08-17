export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', rtl: false },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', rtl: true },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', rtl: true },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';
export const LANGUAGE_STORAGE_KEY = 'veyro-lang';

export function isSupportedLanguage(code: string): code is AppLanguage {
  return SUPPORTED_LANGUAGES.some(l => l.code === code);
}

export function localeToBcp47(code: string): string {
  switch (code) {
    case 'ur':
      return 'ur-PK';
    case 'ar':
      return 'ar-SA';
    default:
      return 'en-US';
  }
}

export function isRtlLocale(code: string): boolean {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.rtl ?? false;
}

export function relativeDateLabels(code: string): { today: string; yesterday: string } {
  switch (code) {
    case 'ur':
      return { today: 'آج', yesterday: 'کل' };
    case 'ar':
      return { today: 'اليوم', yesterday: 'أمس' };
    default:
      return { today: 'Today', yesterday: 'Yesterday' };
  }
}

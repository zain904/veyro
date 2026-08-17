import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  isRtlLocale,
  isSupportedLanguage,
} from '../utils/locale.util';
import { ProfileService } from './profile.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  private profileService = inject(ProfileService);
  private supabase = inject(SupabaseService);

  readonly currentLang = signal<AppLanguage>(DEFAULT_LANGUAGE);
  readonly languages = SUPPORTED_LANGUAGES;

  async initialize(): Promise<void> {
    let lang: AppLanguage = DEFAULT_LANGUAGE;

    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) {
      lang = stored;
    }

    try {
      await this.supabase.whenReady();
      if (this.supabase.currentUser) {
        const profile = await this.profileService.getProfile();
        if (profile?.locale && isSupportedLanguage(profile.locale)) {
          lang = profile.locale;
        }
      }
    } catch {
      /* use stored/default */
    }

    await this.applyLanguage(lang, false);
  }

  async setLanguage(code: AppLanguage, persistProfile = true): Promise<void> {
    await this.applyLanguage(code, persistProfile);
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private async applyLanguage(code: AppLanguage, persistProfile: boolean): Promise<void> {
    await firstValueFrom(this.translate.use(code));
    this.currentLang.set(code);
    const dir = isRtlLocale(code) ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
    document.documentElement.dir = dir;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);

    if (persistProfile && this.supabase.currentUser) {
      try {
        await this.profileService.updateProfile({ locale: code });
      } catch {
        /* keep local preference */
      }
    }
  }
}

import { Injectable, signal } from '@angular/core';
import { ProfileService } from './profile.service';
import { DataRefreshService } from './data-refresh.service';
import {
  DEFAULT_CURRENCY,
  formatCurrency as formatCurrencyUtil,
  currencyPrefix as currencyPrefixUtil,
  getCurrencyOption,
} from '../utils/currency.util';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  readonly currencyCode = signal(DEFAULT_CURRENCY);
  private loaded = false;

  constructor(
    private profileService: ProfileService,
    private refresh: DataRefreshService
  ) {
    this.refresh.refresh$.subscribe(reason => {
      if (reason === 'profile') this.loadCurrency(true);
    });
  }

  async loadCurrency(force = false): Promise<void> {
    if (this.loaded && !force) return;
    try {
      const profile = await this.profileService.getProfile();
      this.currencyCode.set(profile?.currency ?? DEFAULT_CURRENCY);
      this.loaded = true;
    } catch {
      this.currencyCode.set(DEFAULT_CURRENCY);
    }
  }

  format(amount: number | null | undefined, options?: { showSign?: boolean; compact?: boolean }): string {
    return formatCurrencyUtil(amount, this.currencyCode(), options);
  }

  prefix(): string {
    return currencyPrefixUtil(this.currencyCode());
  }

  option() {
    return getCurrencyOption(this.currencyCode());
  }
}

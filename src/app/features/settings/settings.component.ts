import { Component, OnInit, signal, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyService } from '../../core/services/currency.service';
import { LanguageService } from '../../core/services/language.service';
import { Profile } from '../../core/models/transaction.model';
import { APP_AUTHOR, appCopyright } from '../../core/constants/app.constants';
import { SUPPORTED_CURRENCIES } from '../../core/utils/currency.util';
import { AppLanguage, isSupportedLanguage } from '../../core/utils/locale.util';
import { resolveAvatarUrl } from '../../core/utils/profile.util';
import { UserAvatarComponent } from '../../shared/components/user-avatar/user-avatar.component';
import { AsyncPipe } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
    FormsModule, AsyncPipe, UserAvatarComponent, TranslatePipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  theme = inject(ThemeService);
  auth = inject(AuthService);
  currencyService = inject(CurrencyService);
  langService = inject(LanguageService);
  private profileService = inject(ProfileService);
  private transactionService = inject(TransactionService);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);
  private refresh = inject(DataRefreshService);

  loading = signal(true);
  saving = signal(false);
  exporting = signal(false);
  uploadingAvatar = signal(false);
  profile = signal<Profile | null>(null);
  avatarUrl = signal<string | null>(null);
  fullName = '';
  selectedCurrency = 'PKR';
  selectedLanguage: AppLanguage = 'en';
  savingsGoalTarget: number | null = null;
  message = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  author = APP_AUTHOR;
  copyright = appCopyright();
  copyrightYear = new Date().getFullYear();
  currencies = SUPPORTED_CURRENCIES;
  isDev = !environment.production;

  get userEmail(): string | undefined {
    return this.auth.currentUser?.email;
  }

  displayNameFallback(): string {
    return this.auth.currentUser?.user_metadata?.['full_name'] ?? this.langService.instant('common.user');
  }

  ngOnInit(): void {
    this.selectedLanguage = this.langService.currentLang();
    this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    this.loading.set(true);
    try {
      const p = await this.profileService.getProfile();
      this.profile.set(p);
      this.fullName = p?.full_name ?? '';
      this.selectedCurrency = p?.currency ?? 'PKR';
      this.savingsGoalTarget = p?.savings_goal_target ?? null;
      if (p?.locale && isSupportedLanguage(p.locale)) {
        this.selectedLanguage = p.locale;
      } else {
        this.selectedLanguage = this.langService.currentLang();
      }
      this.avatarUrl.set(resolveAvatarUrl(p, this.auth.currentUser));
    } catch (err) {
      console.error(err);
      this.errorMessage.set(this.langService.instant('errors.loadFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  isEmailVerified(user: { email_confirmed_at?: string | null } | null): boolean {
    return !!user?.email_confirmed_at;
  }

  async onLanguageChange(code: AppLanguage): Promise<void> {
    this.selectedLanguage = code;
    await this.langService.setLanguage(code);
  }

  async saveProfile(): Promise<void> {
    this.saving.set(true);
    this.message.set(null);
    this.errorMessage.set(null);
    try {
      const updated = await this.profileService.updateProfile({
        full_name: this.fullName,
        currency: this.selectedCurrency,
        locale: this.selectedLanguage,
        savings_goal_target: this.savingsGoalTarget,
      });
      this.profile.set(updated);
      this.refresh.notify('profile');
      this.message.set(this.langService.instant('settings.profileSaved'));
    } catch (err) {
      this.errorMessage.set(this.langService.instant('settings.profileSaveFailed'));
      console.error(err);
    } finally {
      this.saving.set(false);
    }
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploadingAvatar.set(true);
    this.message.set(null);
    this.errorMessage.set(null);
    try {
      const { profile: updated, sizeKb } = await this.profileService.uploadAvatar(file);
      this.profile.set(updated);
      this.avatarUrl.set(updated.avatar_url);
      this.refresh.notify('profile');
      this.message.set(this.langService.instant('settings.photoSaved', { size: sizeKb }));
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : this.langService.instant('settings.photoUploadFailed'));
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  async removeAvatar(): Promise<void> {
    this.uploadingAvatar.set(true);
    this.message.set(null);
    this.errorMessage.set(null);
    try {
      const updated = await this.profileService.removeAvatar();
      this.profile.set(updated);
      this.avatarUrl.set(resolveAvatarUrl(updated, this.auth.currentUser));
      this.refresh.notify('profile');
      this.message.set(this.langService.instant('settings.photoRemoved'));
    } catch (err) {
      this.errorMessage.set(this.langService.instant('settings.photoRemoveFailed'));
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  async changePassword(email: string | undefined): Promise<void> {
    if (!email) return;
    this.message.set(null);
    this.errorMessage.set(null);
    const result = await this.auth.requestPasswordReset(email);
    if (result.error) {
      this.errorMessage.set(result.error);
    } else {
      this.message.set(this.langService.instant('settings.passwordResetSent', { email }));
    }
  }

  async exportData(format: 'csv' | 'json'): Promise<void> {
    this.exporting.set(true);
    this.message.set(null);
    this.errorMessage.set(null);
    try {
      const transactions = await this.transactionService.getTransactions();
      const filename = `veyro-export-${new Date().toISOString().slice(0, 10)}.${format}`;

      if (format === 'json') {
        this.downloadFile(JSON.stringify(transactions, null, 2), filename, 'application/json');
      } else {
        const header = 'Date,Type,Category,Amount,Description\n';
        const rows = transactions.map(tx =>
          [
            tx.transaction_date,
            tx.type,
            `"${tx.category?.name ?? ''}"`,
            tx.amount,
            `"${(tx.description ?? '').replace(/"/g, '""')}"`,
          ].join(',')
        ).join('\n');
        this.downloadFile(header + rows, filename, 'text/csv');
      }
      this.message.set(this.langService.instant('settings.exportSuccess', {
        count: transactions.length,
        format: format.toUpperCase(),
      }));
    } catch (err) {
      this.errorMessage.set(this.langService.instant('errors.exportFailed'));
      console.error(err);
    } finally {
      this.exporting.set(false);
    }
  }

  async deleteAccountData(): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: this.langService.instant('settings.deleteDataTitle'),
      message: this.langService.instant('settings.deleteDataMessage'),
      confirmLabel: this.langService.instant('settings.deleteDataConfirm'),
      confirmColor: 'warn',
      icon: 'delete_forever',
    });
    if (!confirmed) return;

    this.message.set(null);
    this.errorMessage.set(null);
    try {
      await this.profileService.deleteAllUserData();
      this.message.set(this.langService.instant('settings.deleteDataSuccess'));
      setTimeout(() => this.auth.signOut(), 1200);
    } catch (err) {
      this.errorMessage.set(this.langService.instant('errors.deleteFailed'));
      console.error(err);
    }
  }

  async signOut(): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: this.langService.instant('settings.signOutTitle'),
      message: this.langService.instant('settings.signOutMessage'),
      confirmLabel: this.langService.instant('auth.signOutConfirm'),
      confirmColor: 'warn',
      icon: 'logout',
    });
    if (confirmed) await this.auth.signOut();
  }

  private downloadFile(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { LanguageService } from '../../core/services/language.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { Account } from '../../core/models/transaction.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AccountDialogComponent } from './account-dialog/account-dialog.component';
import { TransferDialogComponent } from './transfer-dialog/transfer-dialog.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, RouterLink,
    VeyroCurrencyPipe, EmptyStateComponent, TranslatePipe,
  ],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
})
export class AccountsComponent implements OnInit, OnDestroy {
  private accountService = inject(AccountService);
  private refresh = inject(DataRefreshService);
  private dialog = inject(MatDialog);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);
  private lang = inject(LanguageService);
  private translate = inject(TranslateService);
  private sub?: Subscription;
  private langSub?: Subscription;

  loading = signal(true);
  error = signal<string | null>(null);
  accounts = signal<Account[]>([]);
  totalBalance = signal(0);

  ngOnInit(): void {
    this.load();
    this.sub = this.refresh.refresh$.subscribe(r => {
      if (['transaction', 'account'].includes(r)) this.load();
    });
    this.langSub = this.translate.onLangChange.subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.langSub?.unsubscribe();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.accountService.getAccountsWithBalances();
      this.accounts.set(data);
      this.totalBalance.set(data.reduce((s, a) => s + (a.balance ?? 0), 0));
    } catch (err) {
      console.error(err);
      this.error.set(this.lang.instant('errors.loadFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  openAccountDialog(account?: Account): void {
    const ref = this.dialog.open(AccountDialogComponent, {
      width: '440px',
      data: { account },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        if (account) {
          await this.accountService.updateAccount(account.id, result);
          this.toast.success('accounts.updated');
        } else {
          await this.accountService.createAccount(result);
          this.toast.success('accounts.created');
        }
        this.refresh.notify('account');
        await this.load();
      } catch (err) {
        console.error(err);
        this.toast.error('errors.saveFailed');
      }
    });
  }

  openTransferDialog(): void {
    const accs = this.accounts();
    if (accs.length < 2) {
      this.toast.message(this.lang.instant('accounts.needTwoAccounts'), 'error');
      return;
    }
    const ref = this.dialog.open(TransferDialogComponent, {
      width: '440px',
      data: { accounts: accs },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.accountService.createTransfer(result);
        this.toast.success('accounts.transferDone');
        this.refresh.notify('transaction');
        await this.load();
      } catch (err) {
        console.error(err);
        this.toast.error('errors.saveFailed');
      }
    });
  }

  async deleteAccount(acc: Account): Promise<void> {
    if (acc.is_default) {
      this.toast.error('accounts.cannotDeleteDefault');
      return;
    }
    const confirmed = await this.confirmDialog.open({
      title: this.lang.instant('accounts.deleteTitle'),
      message: this.lang.instant('accounts.deleteMessage'),
      confirmLabel: this.lang.instant('common.delete'),
      confirmColor: 'warn',
      icon: 'delete',
    });
    if (!confirmed) return;
    try {
      await this.accountService.deleteAccount(acc.id);
      this.toast.success('accounts.deleted');
      this.refresh.notify('account');
      await this.load();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'ACCOUNT_HAS_TRANSACTIONS') {
        this.toast.error('accounts.cannotDeleteHasTx');
      } else {
        this.toast.error('errors.deleteFailed');
      }
    }
  }
}

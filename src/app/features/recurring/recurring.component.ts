import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RecurringService } from '../../core/services/recurring.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountService } from '../../core/services/account.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { LanguageService } from '../../core/services/language.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { RecurringTransaction } from '../../core/models/recurring.model';
import { Category, Account } from '../../core/models/transaction.model';
import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { RecurringDialogComponent } from './recurring-dialog/recurring-dialog.component';

@Component({
  selector: 'app-recurring',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatChipsModule,
    VeyroCurrencyPipe, EmptyStateComponent, TranslatePipe,
  ],
  templateUrl: './recurring.component.html',
  styleUrl: './recurring.component.scss',
})
export class RecurringComponent implements OnInit, OnDestroy {
  private recurringService = inject(RecurringService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);
  private refresh = inject(DataRefreshService);
  private dialog = inject(MatDialog);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);
  private lang = inject(LanguageService);
  private translate = inject(TranslateService);

  loading = signal(true);
  error = signal<string | null>(null);
  items = signal<RecurringTransaction[]>([]);
  categories = signal<Category[]>([]);
  accounts = signal<Account[]>([]);
  private sub?: Subscription;

  ngOnInit(): void {
    this.load();
    this.sub = this.refresh.refresh$.subscribe(r => {
      if (['transaction', 'recurring'].includes(r)) this.load();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [items, categories, accounts] = await Promise.all([
        this.recurringService.getRecurring(true),
        this.categoryService.getCategories(),
        this.accountService.getAccounts(),
      ]);
      this.items.set(items);
      this.categories.set(categories);
      this.accounts.set(accounts);
    } catch (err) {
      console.error(err);
      this.error.set(this.lang.instant('errors.loadFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  openDialog(item?: RecurringTransaction): void {
    const ref = this.dialog.open(RecurringDialogComponent, {
      width: '440px',
      data: { recurring: item, categories: this.categories(), accounts: this.accounts() },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        if (item) {
          await this.recurringService.updateRecurring(item.id, result);
          this.toast.success('recurring.updated');
        } else {
          await this.recurringService.createRecurring(result);
          this.toast.success('recurring.created');
        }
        this.refresh.notify('recurring');
        await this.load();
      } catch (err) {
        console.error(err);
        this.toast.error('errors.saveFailed');
      }
    });
  }

  async toggleActive(item: RecurringTransaction): Promise<void> {
    try {
      await this.recurringService.updateRecurring(item.id, { is_active: !item.is_active });
      this.refresh.notify('recurring');
      await this.load();
    } catch (err) {
      console.error(err);
      this.toast.error('errors.saveFailed');
    }
  }

  async deleteItem(item: RecurringTransaction): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: this.lang.instant('recurring.deleteTitle'),
      message: this.lang.instant('recurring.deleteMessage'),
      confirmLabel: this.lang.instant('common.delete'),
      confirmColor: 'warn',
      icon: 'delete',
    });
    if (!confirmed) return;
    try {
      await this.recurringService.deleteRecurring(item.id);
      this.toast.success('recurring.deleted');
      this.refresh.notify('recurring');
      await this.load();
    } catch (err) {
      console.error(err);
      this.toast.error('errors.deleteFailed');
    }
  }

  frequencyLabel(freq: string): string {
    return this.lang.instant(`recurring.${freq}`);
  }
}

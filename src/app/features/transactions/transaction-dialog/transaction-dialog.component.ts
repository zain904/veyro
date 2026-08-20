import { Component, Inject, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { Category, Transaction, TransactionType, Account } from '../../../core/models/transaction.model';
import { CategoryService } from '../../../core/services/category.service';
import { AccountService } from '../../../core/services/account.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { LanguageService } from '../../../core/services/language.service';

export interface TransactionDialogData {
  transaction?: Transaction;
  presetAmount?: number;
}

@Component({
  selector: 'app-transaction-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './transaction-dialog.component.html',
  styleUrl: './transaction-dialog.component.scss',
})
export class TransactionDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);
  private dialogRef = inject(MatDialogRef<TransactionDialogComponent>);
  private lang = inject(LanguageService);
  currencyService = inject(CurrencyService);

  categories = signal<Category[]>([]);
  accounts = signal<Account[]>([]);
  categoriesError = signal<string | null>(null);
  loadingCategories = signal(false);
  submitting = signal(false);
  submitted = false;
  isEdit = false;

  form = this.fb.group({
    type: ['expense' as TransactionType, Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    category_id: ['', Validators.required],
    account_id: ['', Validators.required],
    description: [''],
    transaction_date: [new Date(), Validators.required],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: TransactionDialogData) {
    this.isEdit = !!data.transaction;
  }

  async ngOnInit(): Promise<void> {
    const tx = this.data.transaction;
    const type = (tx?.type === 'transfer' ? 'expense' : tx?.type) ?? 'expense';
    const [defaultAcc] = await Promise.all([
      this.accountService.getDefaultAccount(),
      this.loadAccounts(),
    ]);
    await this.loadCategories(type as 'income' | 'expense');

    if (tx && tx.type !== 'transfer') {
      this.form.patchValue({
        type: tx.type,
        amount: tx.amount,
        category_id: tx.category_id ?? '',
        account_id: tx.account_id ?? defaultAcc.id,
        description: tx.description ?? '',
        transaction_date: new Date(tx.transaction_date),
      });
    } else if (!tx) {
      this.form.patchValue({ account_id: defaultAcc.id });
      if (this.data.presetAmount != null && this.data.presetAmount > 0) {
        this.form.patchValue({ amount: this.data.presetAmount });
      }
    }

    this.form.get('type')!.valueChanges.subscribe(async (t) => {
      if (t === 'transfer') return;
      await this.loadCategories(t as 'income' | 'expense');
      this.form.patchValue({ category_id: '' });
    });
  }

  private async loadAccounts(): Promise<void> {
    const accs = await this.accountService.getAccounts();
    this.accounts.set(accs);
  }

  private async loadCategories(type: 'income' | 'expense'): Promise<void> {
    this.loadingCategories.set(true);
    this.categoriesError.set(null);
    try {
      const cats = await this.categoryService.getCategories(type);
      this.categories.set(cats);
      if (cats.length === 0) {
        this.categoriesError.set(this.lang.instant('dialogs.categoriesError'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : this.lang.instant('dialogs.categoriesError');
      this.categories.set([]);
      this.categoriesError.set(message);
    } finally {
      this.loadingCategories.set(false);
    }
  }

  showError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.touched || this.submitted));
  }

  save(): void {
    this.submitted = true;
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    const value = this.form.value;
    const result = {
      type: value.type!,
      amount: value.amount!,
      category_id: value.category_id!,
      account_id: value.account_id!,
      description: value.description || null,
      transaction_date: (value.transaction_date as Date).toISOString().split('T')[0],
    };

    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

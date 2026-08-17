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
import { Category, Transaction, TransactionType } from '../../../core/models/transaction.model';
import { CategoryService } from '../../../core/services/category.service';
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
  private dialogRef = inject(MatDialogRef<TransactionDialogComponent>);
  private lang = inject(LanguageService);
  currencyService = inject(CurrencyService);

  categories = signal<Category[]>([]);
  categoriesError = signal<string | null>(null);
  loadingCategories = signal(false);
  submitting = signal(false);
  submitted = false;
  isEdit = false;

  form = this.fb.group({
    type: ['expense' as TransactionType, Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    category_id: ['', Validators.required],
    description: [''],
    transaction_date: [new Date(), Validators.required],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: TransactionDialogData) {
    this.isEdit = !!data.transaction;
  }

  async ngOnInit(): Promise<void> {
    const type = this.data.transaction?.type ?? 'expense';
    await this.loadCategories(type);

    if (this.data.transaction) {
      this.form.patchValue({
        type: this.data.transaction.type,
        amount: this.data.transaction.amount,
        category_id: this.data.transaction.category_id ?? '',
        description: this.data.transaction.description ?? '',
        transaction_date: new Date(this.data.transaction.transaction_date),
      });
    } else if (this.data.presetAmount != null && this.data.presetAmount > 0) {
      this.form.patchValue({ amount: this.data.presetAmount });
    }

    this.form.get('type')!.valueChanges.subscribe(async (type) => {
      await this.loadCategories(type!);
      this.form.patchValue({ category_id: '' });
    });
  }

  private async loadCategories(type: TransactionType): Promise<void> {
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
      description: value.description || null,
      transaction_date: (value.transaction_date as Date).toISOString().split('T')[0],
    };

    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

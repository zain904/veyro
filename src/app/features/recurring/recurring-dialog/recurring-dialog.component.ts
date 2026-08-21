import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RecurringTransaction } from '../../../core/models/recurring.model';
import { Category, Account } from '../../../core/models/transaction.model';

@Component({
  selector: 'app-recurring-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatButtonToggleModule,
    MatDatepickerModule, MatNativeDateModule, TranslatePipe,
  ],
  templateUrl: './recurring-dialog.component.html',
})
export class RecurringDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<RecurringDialogComponent>);
  data = inject<{ recurring?: RecurringTransaction; categories: Category[]; accounts: Account[] }>(MAT_DIALOG_DATA);

  form = this.fb.group({
    type: [this.data.recurring?.type ?? 'expense', Validators.required],
    amount: [this.data.recurring?.amount ?? null, [Validators.required, Validators.min(0.01)]],
    category_id: [this.data.recurring?.category_id ?? ''],
    account_id: [this.data.recurring?.account_id ?? ''],
    description: [this.data.recurring?.description ?? ''],
    frequency: [this.data.recurring?.frequency ?? 'monthly', Validators.required],
    start_date: [this.data.recurring?.start_date ? new Date(this.data.recurring.start_date) : new Date(), Validators.required],
    end_date: [this.data.recurring?.end_date ? new Date(this.data.recurring.end_date) : null as Date | null],
  });

  get filteredCategories(): Category[] {
    const type = this.form.value.type;
    return this.data.categories.filter(c => c.type === type);
  }

  save(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      type: raw.type,
      amount: Number(raw.amount),
      category_id: raw.category_id || null,
      account_id: raw.account_id || null,
      description: raw.description?.trim() || null,
      frequency: raw.frequency,
      start_date: (raw.start_date as Date).toISOString().slice(0, 10),
      end_date: raw.end_date ? (raw.end_date as Date).toISOString().slice(0, 10) : null,
    });
  }
}

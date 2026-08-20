import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Account } from '../../../core/models/transaction.model';
import { CurrencyService } from '../../../core/services/currency.service';

export interface TransferDialogData {
  accounts: Account[];
}

@Component({
  selector: 'app-transfer-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatDatepickerModule, MatNativeDateModule,
    MatIconModule, TranslatePipe,
  ],
  templateUrl: './transfer-dialog.component.html',
  styleUrl: './transfer-dialog.component.scss',
})
export class TransferDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<TransferDialogComponent>);
  currencyService = inject(CurrencyService);

  submitted = false;
  accounts: Account[];

  form = this.fb.group({
    from_account_id: ['', Validators.required],
    to_account_id: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
    transaction_date: [new Date(), Validators.required],
  });

  constructor(@Inject(MAT_DIALOG_DATA) data: TransferDialogData) {
    this.accounts = data.accounts;
  }

  save(): void {
    this.submitted = true;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (v.from_account_id === v.to_account_id) return;

    this.dialogRef.close({
      from_account_id: v.from_account_id,
      to_account_id: v.to_account_id,
      amount: v.amount,
      description: v.description || null,
      transaction_date: (v.transaction_date as Date).toISOString().slice(0, 10),
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Account, AccountType } from '../../../core/models/transaction.model';
import { PK_BANK_PRESETS, ACCOUNT_COLORS } from '../../../core/utils/pk-banks.util';
import { CurrencyService } from '../../../core/services/currency.service';

export interface AccountDialogData {
  account?: Account;
}

@Component({
  selector: 'app-account-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatButtonToggleModule, MatIconModule, TranslatePipe,
  ],
  templateUrl: './account-dialog.component.html',
  styleUrl: './account-dialog.component.scss',
})
export class AccountDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AccountDialogComponent>);
  currencyService = inject(CurrencyService);

  banks = PK_BANK_PRESETS.filter(b => b.code !== 'custom');
  colors = ACCOUNT_COLORS;
  submitted = false;
  isEdit = false;
  useCustomBank = signal(false);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    bank_preset: ['general'],
    custom_bank: [''],
    account_type: ['bank' as AccountType, Validators.required],
    color: ['#6366f1', Validators.required],
    opening_balance: [0 as number | null],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: AccountDialogData) {
    this.isEdit = !!data.account;
    if (data.account) {
      const preset = PK_BANK_PRESETS.find(b => b.name === data.account!.bank_name);
      this.form.patchValue({
        name: data.account.name,
        bank_preset: preset?.code ?? 'custom',
        custom_bank: preset ? '' : (data.account.bank_name ?? ''),
        account_type: data.account.account_type,
        color: data.account.color,
        opening_balance: data.account.opening_balance,
      });
      this.useCustomBank.set(!preset && !!data.account.bank_name);
    }
  }

  onBankChange(code: string): void {
    this.useCustomBank.set(code === 'custom');
    if (code !== 'custom') {
      const preset = PK_BANK_PRESETS.find(b => b.code === code);
      if (preset) {
        this.form.patchValue({ color: preset.color });
      }
    }
  }

  showError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.touched || this.submitted));
  }

  selectColor(color: string): void {
    this.form.patchValue({ color });
  }

  save(): void {
    this.submitted = true;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const preset = PK_BANK_PRESETS.find(b => b.code === raw.bank_preset);
    const bank_name = raw.bank_preset === 'custom'
      ? (raw.custom_bank?.trim() || null)
      : (preset?.name ?? raw.custom_bank?.trim() ?? null);

    this.dialogRef.close({
      name: raw.name!.trim(),
      bank_name,
      account_type: raw.account_type!,
      color: raw.color!,
      opening_balance: raw.opening_balance ?? 0,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

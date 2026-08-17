import { Component, inject, signal, HostListener } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrencyService } from '../../../core/services/currency.service';
import { VeyroCurrencyPipe } from '../../pipes/veyro-currency.pipe';

export interface QuickToolsResult {
  useAmount?: number;
}

@Component({
  selector: 'app-quick-tools-dialog',
  standalone: true,
  imports: [
    MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule,
    MatFormFieldModule, MatInputModule, FormsModule, VeyroCurrencyPipe, TranslatePipe,
  ],
  templateUrl: './quick-tools-dialog.component.html',
  styleUrl: './quick-tools-dialog.component.scss',
})
export class QuickToolsDialogComponent {
  private dialogRef = inject(MatDialogRef<QuickToolsDialogComponent, QuickToolsResult>);
  currencyService = inject(CurrencyService);

  display = signal('0');
  private accumulator: number | null = null;
  private pendingOp: string | null = null;
  private freshOperand = true;

  // Tip & split
  billAmount = 0;
  tipPercent = 10;
  splitPeople = 1;

  // Percentage helper
  percentBase = 0;
  percentRate = 15;

  get tipAmount(): number {
    return Math.round(this.billAmount * (this.tipPercent / 100) * 100) / 100;
  }

  get billWithTip(): number {
    return Math.round((this.billAmount + this.tipAmount) * 100) / 100;
  }

  get perPerson(): number {
    const people = Math.max(1, this.splitPeople);
    return Math.round((this.billWithTip / people) * 100) / 100;
  }

  get percentResult(): number {
    return Math.round(this.percentBase * (this.percentRate / 100) * 100) / 100;
  }

  get numericDisplay(): number {
    const n = parseFloat(this.display());
    return Number.isFinite(n) ? n : 0;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      this.inputDigit(event.key);
    } else if (event.key === '.') {
      event.preventDefault();
      this.inputDecimal();
    } else if (event.key === '+' || event.key === '-' || event.key === '*' || event.key === '/') {
      event.preventDefault();
      this.inputOperator(event.key);
    } else if (event.key === 'Enter' || event.key === '=') {
      event.preventDefault();
      this.calculate();
    } else if (event.key === 'Escape') {
      this.dialogRef.close();
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      this.backspace();
    }
  }

  inputDigit(digit: string): void {
    const current = this.display();
    if (this.freshOperand || current === '0') {
      this.display.set(digit);
      this.freshOperand = false;
    } else {
      this.display.set(current + digit);
    }
  }

  inputDecimal(): void {
    const current = this.display();
    if (this.freshOperand) {
      this.display.set('0.');
      this.freshOperand = false;
      return;
    }
    if (!current.includes('.')) {
      this.display.set(current + '.');
    }
  }

  inputOperator(op: string): void {
    const value = this.numericDisplay;
    if (this.accumulator !== null && this.pendingOp && !this.freshOperand) {
      this.accumulator = this.applyOp(this.accumulator, value, this.pendingOp);
      this.display.set(this.formatNumber(this.accumulator));
    } else {
      this.accumulator = value;
    }
    this.pendingOp = op;
    this.freshOperand = true;
  }

  calculate(): void {
    if (this.accumulator === null || !this.pendingOp) return;
    const result = this.applyOp(this.accumulator, this.numericDisplay, this.pendingOp);
    this.display.set(this.formatNumber(result));
    this.accumulator = null;
    this.pendingOp = null;
    this.freshOperand = true;
  }

  clearAll(): void {
    this.display.set('0');
    this.accumulator = null;
    this.pendingOp = null;
    this.freshOperand = true;
  }

  backspace(): void {
    if (this.freshOperand) return;
    const current = this.display();
    if (current.length <= 1) {
      this.display.set('0');
      this.freshOperand = true;
    } else {
      this.display.set(current.slice(0, -1));
    }
  }

  toggleSign(): void {
    const n = this.numericDisplay;
    this.display.set(this.formatNumber(-n));
    this.freshOperand = false;
  }

  percentOfDisplay(): void {
    const n = this.numericDisplay;
    this.display.set(this.formatNumber(n / 100));
    this.freshOperand = true;
  }

  async copyResult(): Promise<void> {
    try {
      await navigator.clipboard.writeText(String(this.numericDisplay));
    } catch {
      /* clipboard unavailable */
    }
  }

  useInTransaction(amount?: number): void {
    const value = amount ?? this.numericDisplay;
    if (value <= 0) return;
    this.dialogRef.close({ useAmount: Math.round(value * 100) / 100 });
  }

  close(): void {
    this.dialogRef.close();
  }

  private applyOp(a: number, b: number, op: string): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? 0 : a / b;
      default: return b;
    }
  }

  private formatNumber(n: number): string {
    if (!Number.isFinite(n)) return '0';
    const rounded = Math.round(n * 1e10) / 1e10;
    return String(rounded);
  }
}

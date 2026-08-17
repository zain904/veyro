import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'warn';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @if (data.icon) {
        <mat-icon class="confirm-icon" [class.warn]="data.confirmColor === 'warn'">{{ data.icon }}</mat-icon>
      }
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">{{ data.cancelLabel ?? ('common.cancel' | translate) }}</button>
      <button
        mat-flat-button
        [color]="data.confirmColor ?? 'primary'"
        (click)="dialogRef.close(true)">
        {{ data.confirmLabel ?? ('common.confirm' | translate) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 320px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .confirm-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--primary-color);

      &.warn { color: #ef4444; }
    }
  `],
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);
}

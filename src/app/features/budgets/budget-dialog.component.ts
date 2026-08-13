import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Budget, Category } from '../../core/models/transaction.model';

@Component({
  selector: 'app-budget-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.budget ? 'Edit Budget' : 'Set Budget' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Category</mat-label>
        <mat-select [(ngModel)]="categoryId" [disabled]="!!data.budget">
          @for (cat of data.categories; track cat.id) {
            <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Monthly Budget</mat-label>
        <input matInput type="number" [(ngModel)]="amount" min="1">
        <span matTextPrefix>Rs.&nbsp;</span>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="{ categoryId, amount }" [disabled]="!categoryId || !amount">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; } mat-dialog-content { min-width: 340px; }`],
})
export class BudgetDialogComponent {
  categoryId: string;
  amount: number | null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { budget?: Budget; categories: Category[] }) {
    this.categoryId = data.budget?.category_id ?? '';
    this.amount = data.budget?.amount ?? null;
  }
}

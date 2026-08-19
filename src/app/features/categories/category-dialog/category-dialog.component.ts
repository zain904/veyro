import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Category, TransactionType } from '../../../core/models/transaction.model';

export interface CategoryDialogData {
  category?: Category;
}

const CATEGORY_ICONS = [
  'restaurant', 'directions_car', 'receipt_long', 'shopping_bag', 'movie',
  'local_hospital', 'work', 'laptop', 'trending_up', 'attach_money',
  'home', 'school', 'flight', 'pets', 'fitness_center', 'more_horiz', 'category',
];

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#8b5cf6', '#ec4899',
  '#14b8a6', '#22c55e', '#06b6d4', '#3b82f6', '#64748b',
];

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatButtonToggleModule, MatIconModule, TranslatePipe,
  ],
  templateUrl: './category-dialog.component.html',
  styleUrl: './category-dialog.component.scss',
})
export class CategoryDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CategoryDialogComponent>);

  icons = CATEGORY_ICONS;
  colors = CATEGORY_COLORS;
  submitted = false;
  isEdit = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    type: ['expense' as TransactionType, Validators.required],
    icon: ['category', Validators.required],
    color: ['#6366f1', Validators.required],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: CategoryDialogData) {
    this.isEdit = !!data.category;
    if (data.category) {
      this.form.patchValue({
        name: data.category.name,
        type: data.category.type,
        icon: data.category.icon ?? 'category',
        color: data.category.color ?? '#6366f1',
      });
      this.form.get('type')?.disable();
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
    this.dialogRef.close({
      name: raw.name!.trim(),
      type: raw.type!,
      icon: raw.icon!,
      color: raw.color!,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

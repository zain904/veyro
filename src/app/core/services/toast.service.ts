import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LanguageService } from './language.service';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private snackBar = inject(MatSnackBar);
  private lang = inject(LanguageService);

  success(key: string, params?: Record<string, unknown>): void {
    this.open(this.lang.instant(key, params), 'success');
  }

  error(key: string, params?: Record<string, unknown>): void {
    this.open(this.lang.instant(key, params), 'error');
  }

  message(text: string, type: 'success' | 'error' = 'success'): void {
    this.open(text, type);
  }

  private open(text: string, type: 'success' | 'error'): void {
    this.snackBar.open(text, this.lang.instant('common.close'), {
      duration: type === 'error' ? 5000 : 3500,
      panelClass: type === 'error' ? 'veyro-toast-error' : 'veyro-toast-success',
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}

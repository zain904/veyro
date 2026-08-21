import { Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { ImportService, ImportPreview } from '../../../core/services/import.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss',
})
export class ImportDialogComponent {
  private importService = inject(ImportService);
  private dialogRef = inject(MatDialogRef<ImportDialogComponent>);
  private lang = inject(LanguageService);

  preview = signal<ImportPreview | null>(null);
  importing = signal(false);
  resultMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  fileName = signal('');

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.fileName.set(file.name);
    this.resultMessage.set(null);
    this.errorMessage.set(null);

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      this.preview.set(this.importService.parseFile(content));
    };
    reader.readAsText(file);
  }

  downloadTemplate(): void {
    const header = 'Date,Type,Category,Amount,Description,Account\n';
    const sample = '2026-01-15,expense,Food,850,Lunch at office,Main\n';
    const blob = new Blob([header + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veyro-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async import(): Promise<void> {
    const preview = this.preview();
    if (!preview?.rows.length) return;

    this.importing.set(true);
    this.resultMessage.set(null);
    this.errorMessage.set(null);

    try {
      const result = await this.importService.importRows(preview.rows);
      this.resultMessage.set(this.lang.instant('import.success', {
        imported: result.imported,
        skipped: result.skipped,
      }));
      if (result.errors.length) {
        this.errorMessage.set(result.errors.slice(0, 3).join(' '));
      }
      if (result.imported > 0) {
        setTimeout(() => this.dialogRef.close(true), 1200);
      }
    } catch (err) {
      this.errorMessage.set(this.lang.instant('errors.saveFailed'));
      console.error(err);
    } finally {
      this.importing.set(false);
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}

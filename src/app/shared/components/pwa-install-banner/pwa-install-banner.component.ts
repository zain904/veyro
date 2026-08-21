import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { PwaService } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    @if (pwa.canInstall() && !dismissed) {
      <div class="pwa-banner" role="region" [attr.aria-label]="'pwa.bannerLabel' | translate">
        <div class="pwa-banner__content">
          <mat-icon>install_mobile</mat-icon>
          <div>
            <strong>{{ 'pwa.title' | translate }}</strong>
            <p>{{ 'pwa.message' | translate }}</p>
          </div>
        </div>
        <div class="pwa-banner__actions">
          <button mat-button type="button" (click)="dismiss()">{{ 'pwa.notNow' | translate }}</button>
          <button mat-flat-button color="primary" type="button" (click)="install()">{{ 'pwa.install' | translate }}</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .pwa-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin: 0 0 16px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(13, 148, 136, 0.25);
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.08), rgba(20, 184, 166, 0.06));
    }

    .pwa-banner__content {
      display: flex;
      align-items: center;
      gap: 12px;

      mat-icon {
        color: var(--primary-color);
      }

      strong {
        display: block;
        color: var(--text-primary);
      }

      p {
        margin: 2px 0 0;
        font-size: 13px;
        color: var(--text-secondary);
      }
    }

    .pwa-banner__actions {
      display: flex;
      gap: 8px;
    }
  `],
})
export class PwaInstallBannerComponent {
  pwa = inject(PwaService);
  dismissed = false;

  dismiss(): void {
    this.dismissed = true;
    this.pwa.dismissInstall();
  }

  async install(): Promise<void> {
    const ok = await this.pwa.promptInstall();
    if (ok) this.dismissed = true;
  }
}

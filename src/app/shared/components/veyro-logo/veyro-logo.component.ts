import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-veyro-logo',
  standalone: true,
  template: `
    <div
      class="veyro-logo"
      [class.veyro-logo--full]="variant === 'full'"
      [class.veyro-logo--inverted]="inverted"
      [class.veyro-logo--sm]="size === 'sm'"
      [class.veyro-logo--md]="size === 'md'"
      [class.veyro-logo--lg]="size === 'lg'"
      [attr.aria-label]="variant === 'mark' ? 'Veyro' : null"
      [attr.role]="variant === 'mark' ? 'img' : null">
      <svg class="veyro-logo__mark" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient [attr.id]="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0d9488" />
            <stop offset="100%" stop-color="#14b8a6" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" [attr.fill]="'url(#' + gradientId + ')'" />
        <path
          d="M13 34 L24 16 L35 34"
          fill="none"
          stroke="#ffffff"
          stroke-width="3.6"
          stroke-linecap="round"
          stroke-linejoin="round" />
        <path
          d="M24 16 L31 10 L40 14"
          fill="none"
          stroke="#ffffff"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.92" />
        <circle cx="40" cy="14" r="2.6" fill="#ffffff" />
        <path
          d="M12 38 H36"
          stroke="#ffffff"
          stroke-width="2.2"
          stroke-linecap="round"
          opacity="0.55" />
      </svg>

      @if (variant === 'full') {
        <div class="veyro-logo__text">
          <span class="veyro-logo__name">Veyro</span>
          @if (showTagline && tagline) {
            <span class="veyro-logo__tagline">{{ tagline }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .veyro-logo {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .veyro-logo__mark {
      flex-shrink: 0;
      display: block;
    }

    .veyro-logo--sm .veyro-logo__mark {
      width: 32px;
      height: 32px;
    }

    .veyro-logo--md .veyro-logo__mark {
      width: 40px;
      height: 40px;
    }

    .veyro-logo--lg .veyro-logo__mark {
      width: 56px;
      height: 56px;
    }

    .veyro-logo__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .veyro-logo__name {
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      line-height: 1.1;
    }

    .veyro-logo--sm .veyro-logo__name { font-size: 16px; }
    .veyro-logo--md .veyro-logo__name { font-size: 18px; }
    .veyro-logo--lg .veyro-logo__name { font-size: 28px; }

    .veyro-logo__tagline {
      font-size: 11px;
      color: var(--text-secondary);
      line-height: 1.3;
      margin-top: 2px;
    }

    .veyro-logo--lg .veyro-logo__tagline {
      font-size: 13px;
      margin-top: 4px;
    }

    .veyro-logo--inverted .veyro-logo__name,
    .veyro-logo--inverted .veyro-logo__tagline {
      color: #ffffff;
    }

    .veyro-logo--inverted .veyro-logo__tagline {
      opacity: 0.82;
    }
  `],
})
export class VeyroLogoComponent {
  private static nextId = 0;

  @Input() variant: 'mark' | 'full' = 'full';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() inverted = false;
  @Input() showTagline = false;
  @Input() tagline = '';

  readonly gradientId = `veyro-logo-grad-${VeyroLogoComponent.nextId++}`;
}

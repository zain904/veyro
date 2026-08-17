import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_AUTHOR, appCopyright } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <footer class="app-footer" [class.compact]="compact">
      <p class="copyright">{{ copyright }}</p>
      <p class="author">
        {{ 'footer.builtBy' | translate }} <strong>{{ author.name }}</strong>
        ·
        <a [href]="'mailto:' + author.email">{{ author.email }}</a>
      </p>
    </footer>
  `,
  styles: [`
    .app-footer {
      margin-top: 32px;
      padding: 20px 0 8px;
      border-top: 1px solid var(--border-color);
      text-align: center;
    }

    .copyright {
      margin: 0 0 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .author {
      margin: 0;
      font-size: 12px;
      color: var(--text-secondary);

      strong {
        color: var(--text-primary);
        font-weight: 600;
      }

      a {
        color: var(--primary-color);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .app-footer.compact {
      margin-top: 0;
      padding: 12px 16px;
      border-top: none;
      background: transparent;
    }
  `],
})
export class AppFooterComponent {
  @Input() compact = false;
  author = APP_AUTHOR;
  copyright = appCopyright();
}

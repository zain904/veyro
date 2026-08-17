import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div
      class="empty-state"
      [class.compact]="compact"
      [class.inline]="inline"
      [class.card]="card"
      role="status">
      <div class="empty-icon" aria-hidden="true">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <h3>{{ title }}</h3>
      @if (message) {
        <p>{{ message }}</p>
      }
      @if (actionLabel) {
        @if (actionRoute) {
          <a mat-flat-button color="primary" [routerLink]="actionRoute">
            @if (actionIcon) { <mat-icon>{{ actionIcon }}</mat-icon> }
            {{ actionLabel }}
          </a>
        } @else {
          <button mat-flat-button color="primary" type="button" (click)="actionClick.emit()">
            @if (actionIcon) { <mat-icon>{{ actionIcon }}</mat-icon> }
            {{ actionLabel }}
          </button>
        }
      }
    </div>
  `,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'No data yet';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() actionIcon = 'add';
  @Input() actionRoute = '';
  @Input() compact = false;
  @Input() inline = false;
  @Input() card = true;
  @Output() actionClick = new EventEmitter<void>();
}

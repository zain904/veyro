import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { getInitials } from '../../../core/utils/profile.util';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  template: `
    <div
      class="user-avatar"
      [class]="'size-' + size"
      [attr.aria-label]="name ? name + ' avatar' : 'User avatar'"
      role="img">
      @if (avatarUrl && !imageError) {
        <img [src]="avatarUrl" [alt]="name || 'Profile'" (error)="onImageError()" />
      } @else {
        <span class="initials">{{ initials }}</span>
      }
    </div>
  `,
  styleUrl: './user-avatar.component.scss',
})
export class UserAvatarComponent implements OnChanges {
  @Input() avatarUrl: string | null = null;
  @Input() name = '';
  @Input() email: string | null = null;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  imageError = false;

  get initials(): string {
    return getInitials(this.name, this.email);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['avatarUrl']) {
      this.imageError = false;
    }
  }

  onImageError(): void {
    this.imageError = true;
  }
}

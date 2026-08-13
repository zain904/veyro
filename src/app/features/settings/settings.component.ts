import { Component, OnInit, signal, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { Profile } from '../../core/models/transaction.model';
import { APP_AUTHOR, appCopyright } from '../../core/constants/app.constants';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSlideToggleModule,
    FormsModule, AsyncPipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  theme = inject(ThemeService);
  auth = inject(AuthService);
  private profileService = inject(ProfileService);
  private refresh = inject(DataRefreshService);

  loading = signal(true);
  saving = signal(false);
  profile = signal<Profile | null>(null);
  fullName = '';
  message = signal<string | null>(null);
  author = APP_AUTHOR;
  copyright = appCopyright();
  copyrightYear = new Date().getFullYear();

  ngOnInit(): void {
    this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    this.loading.set(true);
    try {
      const p = await this.profileService.getProfile();
      this.profile.set(p);
      this.fullName = p?.full_name ?? '';
    } catch (err) {
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  async saveProfile(): Promise<void> {
    this.saving.set(true);
    this.message.set(null);
    try {
      const updated = await this.profileService.updateProfile({ full_name: this.fullName });
      this.profile.set(updated);
      this.refresh.notify('profile');
      this.message.set('Profile saved successfully.');
    } catch (err) {
      this.message.set('Failed to save profile.');
      console.error(err);
    } finally {
      this.saving.set(false);
    }
  }

  toggleTheme(): void {
    this.theme.toggle();
  }
}

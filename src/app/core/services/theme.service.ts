import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'veyro-theme';
  readonly theme = signal<ThemeMode>(this.loadTheme());

  constructor() {
    effect(() => {
      const mode = this.theme();
      document.body.classList.toggle('dark-theme', mode === 'dark');
      localStorage.setItem(this.STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this.theme.update(current => current === 'light' ? 'dark' : 'light');
  }

  private loadTheme(): ThemeMode {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}

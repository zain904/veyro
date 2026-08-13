import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProfileService } from '../../../core/services/profile.service';
import { DataRefreshService } from '../../../core/services/data-refresh.service';
import { DatabaseService } from '../../../core/services/database.service';
import { AsyncPipe } from '@angular/common';
import { AppFooterComponent } from '../footer/app-footer.component';

const SIDEBAR_COLLAPSED_KEY = 'veyro-sidebar-collapsed';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, AsyncPipe,
    AppFooterComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent implements OnInit, OnDestroy {
  isHandset = false;
  displayName = signal('User');
  sidebarCollapsed = signal(this.readCollapsedPreference());
  private sub?: Subscription;

  navItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Transactions', icon: 'receipt_long', route: '/transactions' },
    { label: 'Budgets', icon: 'account_balance_wallet', route: '/budgets' },
    { label: 'Reports', icon: 'bar_chart', route: '/reports' },
    { label: 'Categories', icon: 'category', route: '/categories' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
  ];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private categoryService: CategoryService,
    private profileService: ProfileService,
    private refresh: DataRefreshService,
    public db: DatabaseService,
    public auth: AuthService,
    public theme: ThemeService
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(r => {
      this.isHandset = r.matches;
    });
  }

  async ngOnInit(): Promise<void> {
    const ready = await this.db.checkSetup();
    if (!ready) return;

    try {
      await this.categoryService.initializeForCurrentUser();
      await this.loadDisplayName();
      this.sub = this.refresh.refresh$.subscribe(reason => {
        if (reason === 'profile') this.loadDisplayName();
      });
    } catch (err) {
      console.error('Failed to initialize user data', err);
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private async loadDisplayName(): Promise<void> {
    const profile = await this.profileService.getProfile();
    if (profile?.full_name) this.displayName.set(profile.full_name);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleSidebarCollapse(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  }

  signOut(): void {
    this.auth.signOut();
  }

  private readCollapsedPreference(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  }
}

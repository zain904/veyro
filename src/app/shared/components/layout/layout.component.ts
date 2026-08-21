import { Component, ElementRef, OnInit, OnDestroy, AfterViewInit, signal, viewChild, inject } from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';

import { MatSidenavContainer, MatSidenavModule } from '@angular/material/sidenav';

import { MatListModule } from '@angular/material/list';

import { MatIconModule } from '@angular/material/icon';

import { MatButtonModule } from '@angular/material/button';

import { MatMenuModule } from '@angular/material/menu';

import { MatTooltipModule } from '@angular/material/tooltip';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { BreakpointObserver } from '@angular/cdk/layout';
import { Dir } from '@angular/cdk/bidi';

import { Subscription } from 'rxjs';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';

import { ThemeService } from '../../../core/services/theme.service';

import { CategoryService } from '../../../core/services/category.service';
import { AccountService } from '../../../core/services/account.service';

import { ProfileService } from '../../../core/services/profile.service';

import { DataRefreshService } from '../../../core/services/data-refresh.service';

import { DatabaseService } from '../../../core/services/database.service';

import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

import { CurrencyService } from '../../../core/services/currency.service';

import { LanguageService } from '../../../core/services/language.service';
import { isRtlLocale } from '../../../core/utils/locale.util';

import { AsyncPipe } from '@angular/common';

import { AppFooterComponent } from '../footer/app-footer.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { VeyroLogoComponent } from '../veyro-logo/veyro-logo.component';
import { QuickToolsDialogComponent, QuickToolsResult } from '../quick-tools/quick-tools-dialog.component';
import { TransactionDialogComponent } from '../../../features/transactions/transaction-dialog/transaction-dialog.component';
import { TransactionService } from '../../../core/services/transaction.service';
import { RecurringService } from '../../../core/services/recurring.service';
import { PwaInstallBannerComponent } from '../pwa-install-banner/pwa-install-banner.component';

const SIDEBAR_COLLAPSED_KEY = 'veyro-sidebar-collapsed';

const SIDEBAR_WIDTH_EXPANDED = 260;

const SIDEBAR_WIDTH_COLLAPSED = 72;

const MOBILE_BREAKPOINT = '(max-width: 767px)';



@Component({

  selector: 'app-layout',

  standalone: true,

  imports: [

    RouterOutlet, RouterLink, RouterLinkActive,

    MatToolbarModule, MatSidenavModule, MatListModule,

    MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule,

    MatDialogModule, AsyncPipe, TranslatePipe, Dir,
    AppFooterComponent, UserAvatarComponent, VeyroLogoComponent, PwaInstallBannerComponent,
  ],

  templateUrl: './layout.component.html',

  styleUrl: './layout.component.scss',

})

export class LayoutComponent implements OnInit, OnDestroy, AfterViewInit {

  isHandset = false;

  displayName = signal('User');
  avatarUrl = signal<string | null>(null);
  sidebarCollapsed = signal(this.readCollapsedPreference());

  sidenavContainer = viewChild(MatSidenavContainer);

  mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');

  private sub?: Subscription;

  private confirmDialog = inject(ConfirmDialogService);

  private currencyService = inject(CurrencyService);

  private dialog = inject(MatDialog);

  private transactionService = inject(TransactionService);
  private recurringService = inject(RecurringService);

  readonly lang = inject(LanguageService);

  private translate = inject(TranslateService);



  get sidenavWidth(): number {

    return !this.isHandset && this.sidebarCollapsed()

      ? SIDEBAR_WIDTH_COLLAPSED

      : SIDEBAR_WIDTH_EXPANDED;

  }



  get contentOffset(): number {

    return this.isHandset ? 0 : this.sidenavWidth;

  }

  get isRtl(): boolean {
    return isRtlLocale(this.lang.currentLang());
  }



  navItems = [

    { labelKey: 'nav.dashboard', icon: 'dashboard', route: '/dashboard' },

    { labelKey: 'nav.transactions', icon: 'receipt_long', route: '/transactions' },

    { labelKey: 'nav.recurring', icon: 'event_repeat', route: '/recurring' },

    { labelKey: 'nav.accounts', icon: 'account_balance', route: '/accounts' },

    { labelKey: 'nav.budgets', icon: 'account_balance_wallet', route: '/budgets' },

    { labelKey: 'nav.reports', icon: 'bar_chart', route: '/reports' },

    { labelKey: 'nav.categories', icon: 'category', route: '/categories' },

    { labelKey: 'nav.settings', icon: 'settings', route: '/settings' },

  ];



  constructor(

    private breakpointObserver: BreakpointObserver,

    private categoryService: CategoryService,
    private accountService: AccountService,

    private profileService: ProfileService,

    private refresh: DataRefreshService,

    public db: DatabaseService,

    public auth: AuthService,

    public theme: ThemeService

  ) {

    this.breakpointObserver.observe([MOBILE_BREAKPOINT]).subscribe(r => {

      this.isHandset = r.matches;

      this.syncSidenavLayout();

    });

    this.translate.onLangChange.subscribe(() => this.syncSidenavLayout());

  }



  async ngOnInit(): Promise<void> {

    const ready = await this.db.checkSetup();

    if (!ready) return;



    try {

      await this.categoryService.initializeForCurrentUser();
      await this.accountService.initializeForCurrentUser();

      const generated = await this.recurringService.processDueRecurring();
      if (generated > 0) {
        this.refresh.notify('transaction');
      }

      await Promise.all([this.loadProfileView(), this.currencyService.loadCurrency()]);
      this.sub = this.refresh.refresh$.subscribe(reason => {
        if (reason === 'profile') {
          this.loadProfileView();
          this.currencyService.loadCurrency(true);
        }
      });

    } catch (err) {

      console.error('Failed to initialize user data', err);

    }

  }



  ngAfterViewInit(): void {

    this.syncSidenavLayout();

  }



  ngOnDestroy(): void {

    this.sub?.unsubscribe();

  }



  syncSidenavLayout(): void {

    const apply = () => {

      const content = this.mainContent()?.nativeElement;

      if (content) {
        // Clear legacy manual margins so Material can manage LTR/RTL correctly
        content.style.removeProperty('margin-inline-start');
        content.style.removeProperty('margin-left');
        content.style.removeProperty('margin-right');
      }

      this.sidenavContainer()?.updateContentMargins();

    };



    queueMicrotask(apply);

    setTimeout(apply, 280);

  }



  private async loadProfileView(): Promise<void> {
    const view = await this.profileService.getProfileView();
    if (view) {
      this.displayName.set(view.fullName);
      this.avatarUrl.set(view.avatarUrl);
    }
  }



  openQuickTools(): void {
    const ref = this.dialog.open(QuickToolsDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'quick-tools-dialog-panel',
    });

    ref.afterClosed().subscribe((result: QuickToolsResult | undefined) => {
      if (result?.useAmount) {
        this.openAddTransaction(result.useAmount);
      }
    });
  }

  openAddTransaction(presetAmount?: number): void {
    const ref = this.dialog.open(TransactionDialogComponent, {
      width: '440px',
      data: presetAmount ? { presetAmount } : {},
    });

    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.transactionService.createTransaction(result);
        this.refresh.notify('transaction');
      } catch (err) {
        console.error(err);
      }
    });
  }

  toggleTheme(): void {

    this.theme.toggle();

  }



  toggleSidebarCollapse(): void {

    const next = !this.sidebarCollapsed();

    this.sidebarCollapsed.set(next);

    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));

    this.syncSidenavLayout();

  }



  async signOut(): Promise<void> {

    const confirmed = await this.confirmDialog.open({

      title: this.lang.instant('auth.signOutTitle'),

      message: this.lang.instant('auth.signOutMessage'),

      confirmLabel: this.lang.instant('auth.signOutConfirm'),

      confirmColor: 'warn',

      icon: 'logout',

    });

    if (confirmed) await this.auth.signOut();

  }



  private readCollapsedPreference(): boolean {

    if (typeof localStorage === 'undefined') return false;

    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';

  }

}


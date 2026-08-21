import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthResult } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private initializedSubject = new BehaviorSubject<boolean>(false);
  private readonly initPromise: Promise<void>;

  currentUser$ = this.currentUserSubject.asObservable();
  initialized$ = this.initializedSubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
    this.initPromise = this.initAuth();
  }

  /** Wait until the session has been restored from storage */
  whenReady(): Promise<void> {
    return this.initPromise;
  }

  private async initAuth(): Promise<void> {
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
      if (event === 'SIGNED_IN' && this.hasOAuthCallbackInUrl()) {
        this.stripAuthParamsFromUrl(new URL(window.location.href));
      }
    });

    try {
      if (this.hasOAuthCallbackInUrl()) {
        await this.completeOAuthRedirect();
      } else {
        const { data: { session }, error } = await this.supabase.auth.getSession();
        if (error && this.isInvalidSessionError(error)) {
          await this.clearStaleSession();
        } else {
          this.currentUserSubject.next(session?.user ?? null);
        }
      }
    } catch (err) {
      if (this.isInvalidSessionError(err)) {
        await this.clearStaleSession();
      } else {
        console.warn('Auth init error', err);
        this.currentUserSubject.next(null);
      }
    } finally {
      this.initializedSubject.next(true);
    }
  }

  private hasOAuthCallbackInUrl(): boolean {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    return url.searchParams.has('code')
      || url.searchParams.has('error')
      || url.hash.includes('access_token=');
  }

  /**
   * Let Supabase (detectSessionInUrl) exchange the PKCE code via getSession().
   * Do NOT call exchangeCodeForSession manually — that causes "Unable to exchange external code".
   */
  private async completeOAuthRedirect(): Promise<void> {
    const url = new URL(window.location.href);
    const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
    if (oauthError) {
      console.warn('OAuth provider error', oauthError);
      this.stripAuthParamsFromUrl(url);
      return;
    }

    const { data: { session }, error } = await this.supabase.auth.getSession();

    if (session?.user) {
      this.currentUserSubject.next(session.user);
      this.stripAuthParamsFromUrl(url);
      return;
    }

    if (error) {
      console.warn('OAuth redirect failed', error.message);
      this.stripAuthParamsFromUrl(url);
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 8000);
      const { data: { subscription } } = this.supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user && event === 'SIGNED_IN') {
          clearTimeout(timeout);
          subscription.unsubscribe();
          this.currentUserSubject.next(session.user);
          this.stripAuthParamsFromUrl(new URL(window.location.href));
          resolve();
        }
      });
    });
  }

  private stripAuthParamsFromUrl(url: URL): void {
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('state');
    const cleanSearch = url.searchParams.toString();
    const path = url.pathname + (cleanSearch ? `?${cleanSearch}` : '');
    window.history.replaceState({}, document.title, path);
  }

  /** Old or revoked tokens in localStorage — clear and treat as signed out */
  private isInvalidSessionError(error: unknown): boolean {
    const message = this.authErrorMessage(error).toLowerCase();
    return message.includes('refresh token')
      || message.includes('invalid jwt')
      || message.includes('session not found');
  }

  private authErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: string }).message);
    }
    return String(error ?? '');
  }

  private async clearStaleSession(): Promise<void> {
    try {
      await this.supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Local wipe is best-effort
    }
    this.currentUserSubject.next(null);
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isInitialized(): boolean {
    return this.initializedSubject.value;
  }

  async signUp(email: string, password: string, fullName: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      return { error: error.message };
    }

    const needsEmailConfirmation = !data.session && !!data.user;
    return {
      error: null,
      needsEmailConfirmation,
      email,
    };
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const message = error.message.toLowerCase().includes('email not confirmed')
        ? 'auth.emailNotConfirmed'
        : error.message;
      return { error: message };
    }

    if (data.user && !data.user.email_confirmed_at && !this.isOAuthUser(data.user)) {
      await this.supabase.auth.signOut();
      return {
        error: 'auth.emailNotConfirmed',
        needsEmailConfirmation: true,
        email,
      };
    }

    return { error: null };
  }

  private isOAuthUser(user: User): boolean {
    const provider = user.app_metadata?.['provider'];
    return provider === 'google' || provider === 'apple';
  }

  async resendConfirmationEmail(email: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { error: error?.message ?? null };
  }

  getPasswordResetRedirectUrl(): string {
    return this.getAppOrigin() + '/reset-password';
  }

  getAuthRedirectUrl(): string {
    return this.getAppOrigin() + '/dashboard';
  }

  private getAppOrigin(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'https://veyro-red.vercel.app';
  }

  async signInWithOAuth(provider: 'google'): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: this.getAuthRedirectUrl(),
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    return { error: error?.message ?? null };
  }

  async resetPasswordForEmail(email: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: this.getPasswordResetRedirectUrl(),
    });
    return { error: error?.message ?? null, email };
  }

  async updatePassword(newPassword: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  getSession(): Observable<Session | null> {
    return new Observable(subscriber => {
      this.supabase.auth.getSession().then(({ data: { session } }) => {
        subscriber.next(session);
        subscriber.complete();
      });
    });
  }
}

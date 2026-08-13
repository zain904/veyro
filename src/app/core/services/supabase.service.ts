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
      },
    });
    this.initPromise = this.initAuth();
  }

  /** Wait until the session has been restored from storage */
  whenReady(): Promise<void> {
    return this.initPromise;
  }

  private async initAuth(): Promise<void> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) {
        console.error('Auth session restore failed', error);
      }
      this.currentUserSubject.next(session?.user ?? null);
    } catch (err) {
      console.error('Auth init error', err);
    } finally {
      this.initializedSubject.next(true);
    }

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
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
        ? 'Please verify your email before signing in. Check your inbox for the confirmation link.'
        : error.message;
      return { error: message };
    }

    if (data.user && !data.user.email_confirmed_at) {
      await this.supabase.auth.signOut();
      return {
        error: 'Please verify your email before signing in. Check your inbox for the confirmation link.',
        needsEmailConfirmation: true,
        email,
      };
    }

    return { error: null };
  }

  async resendConfirmationEmail(email: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.resend({
      type: 'signup',
      email,
    });
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

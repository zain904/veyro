import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, map, Observable, filter, take } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { AuthResult } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$ = this.loadingSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.supabase.initialized$.pipe(
      filter(ready => ready),
      take(1)
    ).subscribe(() => {
      this.loadingSubject.next(false);
    });
  }

  get user$(): Observable<User | null> {
    return this.supabase.currentUser$;
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.supabase.currentUser$.pipe(map(user => !!user));
  }

  get currentUser(): User | null {
    return this.supabase.currentUser;
  }

  async signUp(email: string, password: string, fullName: string): Promise<AuthResult> {
    const result = await this.supabase.signUp(email, password, fullName);
    if (!result.error && !result.needsEmailConfirmation) {
      this.router.navigate(['/dashboard']);
    }
    return result;
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const result = await this.supabase.signIn(email, password);
    if (!result.error) {
      this.router.navigate(['/dashboard']);
    }
    return result;
  }

  async resendConfirmationEmail(email: string): Promise<AuthResult> {
    return this.supabase.resendConfirmationEmail(email);
  }

  async requestPasswordReset(email: string): Promise<AuthResult> {
    return this.supabase.resetPasswordForEmail(email);
  }

  async updatePassword(newPassword: string): Promise<AuthResult> {
    const result = await this.supabase.updatePassword(newPassword);
    if (!result.error) {
      this.router.navigate(['/dashboard']);
    }
    return result;
  }

  async signInWithGoogle(): Promise<AuthResult> {
    return this.supabase.signInWithOAuth('google');
  }

  async signOut(): Promise<void> {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}

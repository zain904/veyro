import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { AppLanguage } from '../../../core/utils/locale.util';
import { AppFooterComponent } from '../../../shared/components/footer/app-footer.component';
import { VeyroLogoComponent } from '../../../shared/components/veyro-logo/veyro-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslatePipe,
    AppFooterComponent,
    VeyroLogoComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  langService = inject(LanguageService);

  isSignUp = signal(false);
  loading = signal(false);
  resending = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  emailConfirmationSent = signal(false);
  passwordResetSent = signal(false);
  pendingEmail = signal('');
  hidePassword = signal(true);

  form = this.fb.group({
    fullName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onLanguageChange(code: AppLanguage): Promise<void> {
    await this.langService.setLanguage(code, false);
  }

  toggleMode(): void {
    this.isSignUp.update(v => !v);
    this.error.set(null);
    this.successMessage.set(null);
    this.emailConfirmationSent.set(false);
    this.passwordResetSent.set(false);
  }

  showForgotPassword(): void {
    this.passwordResetSent.set(true);
    this.isSignUp.set(false);
    this.emailConfirmationSent.set(false);
    this.error.set(null);
    this.successMessage.set(null);
    if (this.form.value.email) {
      this.pendingEmail.set(this.form.value.email);
    }
  }

  backFromForgotPassword(): void {
    this.passwordResetSent.set(false);
    this.error.set(null);
    this.successMessage.set(null);
  }

  backToSignIn(): void {
    this.emailConfirmationSent.set(false);
    this.passwordResetSent.set(false);
    this.isSignUp.set(false);
    this.error.set(null);
    this.successMessage.set(null);
  }

  async sendPasswordReset(): Promise<void> {
    const email = this.form.value.email?.trim();
    if (!email) {
      this.error.set('Enter your email address first.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    try {
      const result = await this.auth.requestPasswordReset(email);
      if (result.error) {
        this.error.set(result.error);
      } else {
        this.pendingEmail.set(email);
        this.successMessage.set('Password reset link sent! Check your inbox and spam folder.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    const { email, password, fullName } = this.form.value;

    try {
      const result = this.isSignUp()
        ? await this.auth.signUp(email!, password!, fullName || 'User')
        : await this.auth.signIn(email!, password!);

      if (result.error) {
        this.error.set(result.error);
        if (result.needsEmailConfirmation && result.email) {
          this.pendingEmail.set(result.email);
        }
        return;
      }

      if (result.needsEmailConfirmation) {
        this.pendingEmail.set(result.email ?? email!);
        this.emailConfirmationSent.set(true);
        this.form.reset();
      }
    } finally {
      this.loading.set(false);
    }
  }

  async resendConfirmation(): Promise<void> {
    const email = this.pendingEmail() || this.form.value.email;
    if (!email) return;

    this.resending.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    try {
      const result = await this.auth.resendConfirmationEmail(email);
      if (result.error) {
        this.error.set(result.error);
      } else {
        this.successMessage.set('Verification email sent again. Please check your inbox.');
      }
    } finally {
      this.resending.set(false);
    }
  }
}

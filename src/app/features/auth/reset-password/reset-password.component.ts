import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AppFooterComponent } from '../../../shared/components/footer/app-footer.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    AppFooterComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private supabase = inject(SupabaseService);

  loading = signal(true);
  submitting = signal(false);
  validLink = signal(false);
  error = signal<string | null>(null);
  hidePassword = signal(true);
  hideConfirm = signal(true);

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch }
  );

  async ngOnInit(): Promise<void> {
    await this.supabase.whenReady();
    const { data: { session } } = await this.supabase.client.auth.getSession();
    if (session?.user) {
      this.validLink.set(true);
    } else {
      this.error.set('This reset link is invalid or has expired. Please request a new one.');
    }
    this.loading.set(false);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.error.set(null);

    try {
      const result = await this.auth.updatePassword(this.form.value.password!);
      if (result.error) {
        this.error.set(result.error);
      }
    } finally {
      this.submitting.set(false);
    }
  }
}

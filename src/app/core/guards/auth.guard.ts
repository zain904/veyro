import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { from, map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  return from(supabase.whenReady()).pipe(
    map(() => {
      if (supabase.currentUser) return true;
      return router.createUrlTree(['/login']);
    })
  );
};

export const guestGuard: CanActivateFn = () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  return from(supabase.whenReady()).pipe(
    map(() => {
      if (!supabase.currentUser) return true;
      return router.createUrlTree(['/dashboard']);
    })
  );
};

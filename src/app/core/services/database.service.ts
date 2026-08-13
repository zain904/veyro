import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  readonly isReady = signal(true);
  readonly setupMessage = signal<string | null>(null);
  private checked = false;

  constructor(private supabase: SupabaseService) {}

  async checkSetup(): Promise<boolean> {
    if (this.checked) return this.isReady();

    await this.supabase.whenReady();
    this.checked = true;

    const { error } = await this.supabase.client
      .from('categories')
      .select('id', { head: true, count: 'exact' });

    if (error && (error.code === 'PGRST205' || error.message.includes('Could not find the table'))) {
      this.isReady.set(false);
      this.setupMessage.set(
        'Database not set up. Open Supabase → SQL Editor → paste and run the file supabase/schema.sql from this project.'
      );
      return false;
    }

    this.isReady.set(true);
    this.setupMessage.set(null);
    return true;
  }
}

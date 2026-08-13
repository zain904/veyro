import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Profile } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private supabase: SupabaseService) {}

  async getProfile(): Promise<Profile | null> {
    await this.supabase.whenReady();
    const user = this.supabase.currentUser;
    if (!user) return null;

    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data as Profile | null;
  }

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const user = this.supabase.currentUser!;
    const { data, error } = await this.supabase.client
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  }
}

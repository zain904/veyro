import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Profile } from '../models/transaction.model';
import { getInitials, ProfileView, resolveAvatarUrl } from '../utils/profile.util';
import { AVATAR_MAX_KB, compressAvatarImage } from '../utils/image.util';

const AVATAR_BUCKET = 'avatars';

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

  async getProfileView(): Promise<ProfileView | null> {
    await this.supabase.whenReady();
    const user = this.supabase.currentUser;
    if (!user) return null;

    const profile = await this.getProfile();
    const fullName =
      profile?.full_name?.trim() ||
      (user.user_metadata?.['full_name'] as string | undefined)?.trim() ||
      'User';

    return {
      fullName,
      avatarUrl: resolveAvatarUrl(profile, user),
      initials: getInitials(fullName, user.email),
      email: user.email ?? null,
    };
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

  async uploadAvatar(file: File): Promise<{ profile: Profile; sizeKb: number }> {
    const compressed = await compressAvatarImage(file);

    const user = this.supabase.currentUser!;
    const ext = compressed.contentType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from(AVATAR_BUCKET)
      .upload(path, compressed.blob, {
        upsert: true,
        contentType: compressed.contentType,
      });

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('bucket')) {
        throw new Error('Photo storage is not set up yet. Run the latest supabase/schema.sql in Supabase.');
      }
      if (uploadError.message.toLowerCase().includes('size') || uploadError.message.toLowerCase().includes('payload')) {
        throw new Error(`Upload rejected — max ${AVATAR_MAX_KB} KB per photo on free tier.`);
      }
      throw uploadError;
    }

    const { data: urlData } = this.supabase.client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const profile = await this.updateProfile({ avatar_url: avatarUrl });
    return { profile, sizeKb: compressed.sizeKb };
  }

  async removeAvatar(): Promise<Profile> {
    return this.updateProfile({ avatar_url: null });
  }

  async deleteAllUserData(): Promise<void> {
    await this.supabase.whenReady();
    const { error } = await this.supabase.client.rpc('delete_user_data');
    if (error) throw error;
  }
}

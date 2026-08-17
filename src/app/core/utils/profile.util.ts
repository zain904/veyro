import { User } from '@supabase/supabase-js';
import { Profile } from '../models/transaction.model';

/** Resolve avatar URL from profile row or Supabase Auth user metadata (OAuth). */
export function resolveAvatarUrl(profile: Profile | null | undefined, user: User | null | undefined): string | null {
  const fromProfile = profile?.avatar_url?.trim();
  if (fromProfile) return fromProfile;

  const meta = user?.user_metadata;
  if (!meta) return null;

  const candidates = [meta['avatar_url'], meta['picture'], meta['photo_url']];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

export function getInitials(name: string | null | undefined, email?: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  if (email?.trim()) return email.trim()[0].toUpperCase();
  return '?';
}

export interface ProfileView {
  fullName: string;
  avatarUrl: string | null;
  initials: string;
  email: string | null;
}

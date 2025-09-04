import { getSupabaseAdmin } from './supabaseAdmin';

export type Role = 'owner'|'admin'|'member'|'viewer';

export async function getUserRole(uid: string, businessId: string): Promise<Role|null> {
  const supa = getSupabaseAdmin();
  // Owner
  const { data: owner } = await supa.from('businesses').select('owner_uid').eq('id', businessId).maybeSingle();
  if (owner?.owner_uid === uid) return 'owner';
  const { data: m } = await supa.from('business_members').select('role').eq('business_id', businessId).eq('uid', uid).maybeSingle();
  return (m?.role as Role) || null;
}

export function canManageMembers(role: Role|null): boolean {
  return role === 'owner' || role === 'admin';
}


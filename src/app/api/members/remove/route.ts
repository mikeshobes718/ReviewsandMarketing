import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUid } from '@/lib/authServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserRole, canManageMembers } from '@/lib/roles';

const Body = z.object({ businessId: z.string(), uid: z.string() });

export async function POST(req: Request) {
  const actor = await requireUid().catch(() => null);
  if (!actor) return new NextResponse('Unauthorized', { status: 401 });
  const { businessId, uid } = Body.parse(await req.json());
  const role = await getUserRole(actor, businessId);
  if (!canManageMembers(role)) return new NextResponse('Forbidden', { status: 403 });
  const supa = getSupabaseAdmin();
  await supa.from('business_members').delete().eq('business_id', businessId).eq('uid', uid);
  return NextResponse.json({ ok: true });
}


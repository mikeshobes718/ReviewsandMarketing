import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUid } from '@/lib/authServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const Body = z.object({ token: z.string() });

export async function POST(req: Request) {
  const uid = await requireUid().catch(() => null);
  if (!uid) return new NextResponse('Unauthorized', { status: 401 });
  const { token } = Body.parse(await req.json());
  const supa = getSupabaseAdmin();
  const { data: inv } = await supa.from('member_invites').select('business_id,role').eq('token', token).maybeSingle();
  if (!inv) return new NextResponse('Invalid token', { status: 400 });
  await supa.from('business_members').upsert({ business_id: inv.business_id, uid, role: inv.role });
  await supa.from('member_invites').update({ accepted_at: new Date().toISOString(), accepted_by: uid }).eq('token', token);
  return NextResponse.json({ ok: true });
}


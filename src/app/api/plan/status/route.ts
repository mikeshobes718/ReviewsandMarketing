import { NextResponse } from 'next/server';
import { requireUid } from '@/lib/authServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await requireUid().catch(() => null);
  if (!uid) return new NextResponse('Unauthorized', { status: 401 });
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from('subscriptions')
    .select('status, updated_at')
    .eq('uid', uid)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return new NextResponse(error.message, { status: 500 });
  const status = (data?.status as string | undefined) || 'none';
  return NextResponse.json({ status });
}


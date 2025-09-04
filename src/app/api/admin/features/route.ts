import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const KEY = 'feature_flags';

export async function GET(req: Request) {
  const token = req.headers.get('x-admin-token') || '';
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return new NextResponse('forbidden', { status: 403 });
  const supa = getSupabaseAdmin();
  const { data } = await supa.from('place_cache').select('data').eq('place_id', KEY).maybeSingle();
  const flags = (data?.data ?? {}) as Record<string, unknown>;
  return NextResponse.json({ flags });
}

export async function POST(req: Request) {
  const token = req.headers.get('x-admin-token') || '';
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return new NextResponse('forbidden', { status: 403 });
  const supa = getSupabaseAdmin();
  const body = await req.json();
  await supa.from('place_cache').upsert({ place_id: KEY, data: body, fetched_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

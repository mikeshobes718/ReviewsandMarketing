import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = req.headers.get('x-admin-token') || '';
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return new NextResponse('forbidden', { status: 403 });
  const status = url.searchParams.get('status') || undefined;
  const supa = getSupabaseAdmin();
  let query = supa
    .from('subscriptions')
    .select('uid,plan_id,status,current_period_end,updated_at')
    .order('updated_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query.limit(200);
  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ subscriptions: data || [] });
}


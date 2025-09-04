import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').toLowerCase();
  const token = req.headers.get('x-admin-token') || '';
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return new NextResponse('forbidden', { status: 403 });
  }
  if (!email) return new NextResponse('missing email', { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase.from('users').select('uid').eq('email', email).maybeSingle();
  if (!user?.uid) return NextResponse.json({ email, status: 'none' });
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, updated_at')
    .eq('uid', user.uid)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ email, status: sub?.status || 'none' });
}


import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = req.headers.get('x-admin-token') || '';
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return new NextResponse('forbidden', { status: 403 });
  const limit = Number(url.searchParams.get('limit') || '50');
  const offset = Number(url.searchParams.get('offset') || '0');
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from('users')
    .select('uid,email,created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ users: data || [] });
}


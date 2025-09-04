import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = req.headers.get('x-admin-token') || '';
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return new NextResponse('forbidden', { status: 403 });
  const limit = Number(url.searchParams.get('limit') || '50');
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from('email_log')
    .select('id,provider,to_email,template,status,provider_message_id,payload,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ emails: data || [] });
}


import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthAdmin } from '@/lib/firebaseAdmin';
import { requireUid } from '@/lib/authServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Prefer session cookie; fallback to Authorization bearer
  let uid: string | null = null;
  try {
    uid = await requireUid();
  } catch {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7)
      : undefined;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });
    try {
      const auth = getAuthAdmin();
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .eq('owner_uid', uid!)
    .limit(1)
    .maybeSingle();

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ business: data ?? null });
}


import { NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebaseAdmin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const { idToken, days } = await req.json();
  if (!idToken) return new NextResponse('Missing idToken', { status: 400 });
  const auth = getAuthAdmin();
  const expiresIn = Math.min(Math.max(1, Number(days) || 7), 14) * 24 * 60 * 60 * 1000; // 1-14 days
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
  // Mirror user into Supabase users table for joins/webhooks
  try {
    const decoded = await auth.verifyIdToken(idToken);
    const supa = getSupabaseAdmin();
    const email = (decoded as unknown as { email?: string }).email || '';
    if (decoded?.uid && email) {
      await supa.from('users').upsert({ uid: decoded.uid, email });
    }
  } catch {}
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', `idToken=${sessionCookie}; Max-Age=${expiresIn/1000}; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return res;
}

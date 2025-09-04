import { NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

export async function GET() {
  const cookie = (await cookies()).get('idToken')?.value || '';
  if (!cookie) return new NextResponse('Unauthorized', { status: 401 });
  const auth = getAuthAdmin();
  try {
    const dec = await auth.verifySessionCookie(cookie, true);
    const user = await auth.getUser(dec.uid);
    return NextResponse.json({ uid: dec.uid, email: user.email || null });
  } catch {
    try {
      const dec = await auth.verifyIdToken(cookie);
      const user = await auth.getUser(dec.uid);
      return NextResponse.json({ uid: dec.uid, email: user.email || null });
    } catch {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }
}


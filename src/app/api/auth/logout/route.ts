import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', 'idToken=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  return res;
}


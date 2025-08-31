import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthAdmin } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Auth guard: expect Firebase ID token in Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : undefined;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  let uid: string;
  try {
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const body = await req.json();

  const { error } = await supabaseAdmin.from('businesses').upsert({
    owner_uid: uid,
    name: body.name,
    google_place_id: body.google_place_id,
    google_maps_place_uri: body.google_maps_place_uri,
    google_maps_write_review_uri: body.google_maps_write_review_uri,
    review_link: body.review_link,
    google_rating: body.google_rating,
    updated_at: new Date().toISOString(),
  });

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}



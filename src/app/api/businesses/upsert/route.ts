import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthAdmin } from '@/lib/firebaseAdmin';
import { requireUid } from '@/lib/authServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Prefer session cookie; fallback to Authorization: Bearer <idToken>
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

  const body = await req.json();

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from('businesses').upsert({
    owner_uid: uid!,
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


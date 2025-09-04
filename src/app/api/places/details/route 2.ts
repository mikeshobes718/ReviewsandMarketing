import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  const sessionToken = searchParams.get('sessionToken') || undefined;

  if (!placeId) return new NextResponse('Missing placeId', { status: 400 });

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask': [
        'id',
        'displayName',
        'formattedAddress',
        'rating',
        'userRatingCount',
        'googleMapsUri',
        'googleMapsLinks.placeUri',
        'googleMapsLinks.writeAReviewUri',
        'googleMapsLinks.reviewsUri',
      ].join(','),
      ...(sessionToken ? { 'X-Goog-Session-Token': sessionToken } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(`Details error: ${res.status} ${text}`, { status: 500 });
  }

  const p = (await res.json()) as {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    googleMapsLinks?: { writeAReviewUri?: string; reviewsUri?: string };
  };
  return NextResponse.json({
    id: p.id,
    displayName: p.displayName?.text,
    formattedAddress: p.formattedAddress,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    googleMapsUri: p.googleMapsUri,
    writeAReviewUri: p.googleMapsLinks?.writeAReviewUri,
    reviewsUri: p.googleMapsLinks?.reviewsUri,
  });
}



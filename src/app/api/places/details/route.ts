import { NextResponse } from 'next/server';
import { getPlaceDetails } from '@/lib/googlePlaces';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  const sessionToken = searchParams.get('sessionToken') || undefined;

  if (!placeId) return new NextResponse('Missing placeId', { status: 400 });
  const p = await getPlaceDetails(placeId, sessionToken) as {
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



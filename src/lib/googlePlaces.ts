import { ENV } from './env';

export async function getPlaceDetails(placeId: string) {
  const fields =
    'id,displayName,formattedAddress,googleMapsUri,rating,userRatingCount,internationalPhoneNumber,websiteUri';
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=${fields}`;
  const res = await fetch(url, {
    headers: { 'X-Goog-Api-Key': ENV.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': fields }
  });
  if (!res.ok) throw new Error(`Places API error: ${res.status}`);
  return res.json();
}

export function makeGoogleReviewLink(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

import { getEnv } from './env';

export async function placesAutocomplete(input: string, sessionToken: string, includedRegionCodes?: string[]) {
  const { GOOGLE_MAPS_API_KEY } = getEnv();
  const fields =
    'suggestions.placePrediction.placeId,' +
    'suggestions.placePrediction.structuredFormat.mainText.text,' +
    'suggestions.placePrediction.structuredFormat.secondaryText.text';

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': fields,
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes,
    }),
  });
  if (!res.ok) throw new Error(`Autocomplete error: ${res.status}`);
  return res.json();
}

export async function getPlaceDetails(placeId: string, sessionToken?: string) {
  const { GOOGLE_MAPS_API_KEY } = getEnv();
  const mask = [
    'id',
    'displayName',
    'formattedAddress',
    'rating',
    'userRatingCount',
    'googleMapsUri',
    'googleMapsLinks.placeUri',
    'googleMapsLinks.writeAReviewUri',
    'googleMapsLinks.reviewsUri',
  ].join(',');
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': mask,
      ...(sessionToken ? { 'X-Goog-Session-Token': sessionToken } : {}),
    },
  });
  if (!res.ok) throw new Error(`Details error: ${res.status}`);
  return res.json();
}

export function makeGoogleReviewLinkFromWriteUri(writeAReviewUri?: string, placeId?: string) {
  if (writeAReviewUri) return writeAReviewUri;
  if (placeId) return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  return '';
}

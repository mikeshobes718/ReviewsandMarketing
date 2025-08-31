import { NextResponse } from 'next/server';

type Body = { input: string; sessionToken: string; includedRegionCodes?: string };
type RawSuggestion = {
  placePrediction?: {
    placeId: string;
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { input, sessionToken, includedRegionCodes } = (await req.json()) as Body;

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,' +
        'suggestions.placePrediction.structuredFormat.mainText.text,' +
        'suggestions.placePrediction.structuredFormat.secondaryText.text',
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: (includedRegionCodes || process.env.PLACES_INCLUDED_REGION_CODES || 'US')
        .split(',')
        .map((s) => s.trim()),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(`Autocomplete error: ${res.status} ${text}`, { status: 500 });
  }

  const data = (await res.json()) as { suggestions?: RawSuggestion[] };
  const items = (data.suggestions ?? [])
    .filter((s) => Boolean(s.placePrediction))
    .map((s) => ({
      placeId: s.placePrediction!.placeId,
      mainText: s.placePrediction!.structuredFormat?.mainText?.text ?? '',
      secondaryText: s.placePrediction!.structuredFormat?.secondaryText?.text ?? '',
    }));

  return NextResponse.json({ items });
}



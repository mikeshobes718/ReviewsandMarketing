import { NextResponse } from 'next/server';
import { z } from 'zod';
import { placesAutocomplete } from '@/lib/googlePlaces';

const Body = z.object({
  input: z.string().min(1),
  sessionToken: z.string().min(1),
  includedRegionCodes: z.string().optional(),
});
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
  const { input, sessionToken, includedRegionCodes } = Body.parse(await req.json());

  const data = await placesAutocomplete(
    input,
    sessionToken,
    (includedRegionCodes || 'US').split(',').map((s) => s.trim())
  );
  const items = (data.suggestions ?? [])
    .filter((s: RawSuggestion) => Boolean(s.placePrediction))
    .map((s: RawSuggestion) => ({
      placeId: s.placePrediction!.placeId,
      mainText: s.placePrediction!.structuredFormat?.mainText?.text ?? '',
      secondaryText: s.placePrediction!.structuredFormat?.secondaryText?.text ?? '',
    }));

  return NextResponse.json({ items });
}



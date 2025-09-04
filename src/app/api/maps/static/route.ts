import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new NextResponse('Missing lat/lng', { status: 400 });
  }
  const zoom = Math.min(20, Math.max(1, Number(searchParams.get('zoom') || 15)));
  const w = Math.min(1024, Math.max(100, Number(searchParams.get('w') || 600)));
  const h = Math.min(1024, Math.max(100, Number(searchParams.get('h') || 240)));
  const scale = 2; // retina
  const { GOOGLE_MAPS_API_KEY } = getEnv();
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.set('center', `${lat},${lng}`);
  url.searchParams.set('zoom', String(zoom));
  url.searchParams.set('size', `${w}x${h}`);
  url.searchParams.set('scale', String(scale));
  url.searchParams.set('maptype', 'roadmap');
  url.searchParams.set('markers', `color:red|${lat},${lng}`);
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
  const r = await fetch(url.toString());
  if (!r.ok) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w*scale}" height="${h*scale}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#eef2ff"/><stop offset="100%" stop-color="#e0f2fe"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${Math.floor(w/2)}" cy="${Math.floor(h/2)}" r="6" fill="#ef4444" stroke="#111827" stroke-width="1"/></svg>`;
    return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=600' } });
  }
  const buf = Buffer.from(await r.arrayBuffer());
  return new NextResponse(buf, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
}

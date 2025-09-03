import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get('data') || '';
  const format = (searchParams.get('format') || 'png').toLowerCase();
  const scale = Number(searchParams.get('scale') || 8);
  const margin = Number(searchParams.get('margin') || 1);

  if (!data) return new NextResponse('Missing data', { status: 400 });

  if (format === 'svg') {
    const svg = await QRCode.toString(data, { type: 'svg', margin, scale });
    return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
  } else {
    const png = await QRCode.toBuffer(data, { type: 'png', margin, scale });
    const uint8 = new Uint8Array(png);
    return new NextResponse(uint8, { headers: { 'Content-Type': 'image/png' } });
  }
}



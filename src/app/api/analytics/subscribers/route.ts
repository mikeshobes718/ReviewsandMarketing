import { NextResponse } from 'next/server';
import { getActiveSubscribersAndMRR } from '@/lib/entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { active, mrrUSD } = await getActiveSubscribersAndMRR();
    return NextResponse.json({ active, mrrUSD });
  } catch (e) {
    return NextResponse.json({ active: 0, mrrUSD: 0 }, { status: 200 });
  }
}


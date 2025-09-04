import { NextResponse } from 'next/server';
import { requireUid } from '@/lib/authServer';
import { hasActivePro } from '@/lib/entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await requireUid().catch(() => null);
  if (!uid) return new NextResponse('Unauthorized', { status: 401 });
  const pro = await hasActivePro(uid);
  return NextResponse.json({ pro });
}


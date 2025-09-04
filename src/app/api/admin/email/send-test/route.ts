import { NextResponse } from 'next/server';
import { getPostmarkClient } from '@/lib/postmark';
import { getEnv } from '@/lib/env';
import { brandedHtml } from '@/lib/emailTemplates';

export async function POST(req: Request) {
  const token = req.headers.get('x-admin-token') || '';
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return new NextResponse('forbidden', { status: 403 });
  const { email, title = 'Test email', intro = 'This is a test from Admin', url } = await req.json();
  const { EMAIL_FROM } = getEnv();
  const pm = getPostmarkClient();
  const html = brandedHtml({ title, intro, ctaText: url ? 'Open link' : undefined, ctaUrl: url });
  await pm.sendEmail({ From: EMAIL_FROM, To: email, Subject: title, HtmlBody: html, TextBody: `${intro}${url?`\n\n${url}`:''}` });
  return NextResponse.json({ ok: true });
}


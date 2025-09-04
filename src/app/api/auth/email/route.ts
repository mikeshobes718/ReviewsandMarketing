import { NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebaseAdmin';
import { getPostmarkClient } from '@/lib/postmark';
import { getEnv } from '@/lib/env';
import { resetEmailTemplate, verifyEmailTemplate } from '@/lib/emailTemplates';

export async function POST(req: Request) {
  const { email, type } = await req.json();
  const { EMAIL_FROM, APP_URL } = getEnv();
  const auth = getAuthAdmin();
  const postmark = getPostmarkClient();
  const link =
    type === 'verify'
      ? await auth.generateEmailVerificationLink(email, { url: `${APP_URL}/login` })
      : await auth.generatePasswordResetLink(email, { url: `${APP_URL}/login` });

  const tpl = type === 'verify' ? verifyEmailTemplate(link) : resetEmailTemplate(link);
  const r = await postmark.sendEmail({ From: EMAIL_FROM, To: email, Subject: tpl.subject, HtmlBody: tpl.html, TextBody: tpl.text });

  return NextResponse.json({ ok: true, id: (r as unknown as { MessageID: string }).MessageID });
}

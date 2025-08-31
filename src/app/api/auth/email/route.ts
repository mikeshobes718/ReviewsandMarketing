import { NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebaseAdmin';
import { postmark } from '@/lib/postmark';
import { ENV } from '@/lib/env';

export async function POST(req: Request) {
  const { email, type } = await req.json();
  let link: string;

  const auth = getAuthAdmin();
  if (type === 'verify') {
    link = await auth.generateEmailVerificationLink(email, { url: `${ENV.APP_URL}/login` });
  } else {
    link = await auth.generatePasswordResetLink(email, { url: `${ENV.APP_URL}/login` });
  }

  const r = await postmark.sendEmail({
    From: ENV.EMAIL_FROM,
    To: email,
    Subject: type === 'verify' ? 'Verify your email' : 'Reset your password',
    TextBody: `Click the link: ${link}`,
  });

  return NextResponse.json({ ok: true, id: (r as unknown as { MessageID: string }).MessageID });
}

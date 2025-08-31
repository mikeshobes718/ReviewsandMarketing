import { NextResponse } from 'next/server';
import { getPostmarkClient } from '@/lib/postmark';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { makeGoogleReviewLinkFromWriteUri } from '@/lib/googlePlaces';
import { getEnv } from '@/lib/env';

export async function POST(req: Request) {
  const { businessId, placeId, toEmail, customerName, reviewLink } = await req.json();
  const postmark = getPostmarkClient();
  const supabaseAdmin = getSupabaseAdmin();
  const { EMAIL_FROM } = getEnv();

  const link = reviewLink || makeGoogleReviewLinkFromWriteUri(undefined, placeId);
  const result = await postmark.sendEmail({
    From: EMAIL_FROM,
    To: toEmail,
    Subject: 'Quick review request',
    HtmlBody: `<p>Hi ${customerName || ''},</p><p>Please leave a quick review: <a href="${link}">Google review</a>.</p>`,
    TextBody: `Please leave a review: ${link}`,
    MessageStream: 'outbound',
  });

  await supabaseAdmin.from('review_requests').insert({
    business_id: businessId,
    google_place_id: placeId,
    review_link: link,
    status: 'sent',
    provider_message_id: (result as unknown as { MessageID: string }).MessageID,
  });

  return NextResponse.json({ ok: true });
}

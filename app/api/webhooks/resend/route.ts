// app/api/webhooks/resend/route.ts
// ─── Resend webhook — bounce + complaint + delivery handler ──────────────────
// Resend fires this on email events. Configure in Resend dashboard:
//   Webhooks → Add endpoint → https://antcpu-ads.vercel.app/api/webhooks/resend
//   Events: email.bounced, email.complained, email.delivered
//
// email.bounced    → email_validity.status = 'bounced'
//                    Hard bounce = bad address, never retry
//                    Soft bounce = temporary, still blocked until resolved
//
// email.complained → email_validity.status = 'unsubscribed'
//                    Spam complaint = treat same as opt-out
//                    Gmail/Yahoo penalise senders who ignore complaints
//
// email.delivered  → email_validity.status = 'valid'
//                    Confirmed deliverable — promotes from 'unknown'
//
// After any event checkEmailGate() reads email_validity and acts accordingly.
// No RESEND_WEBHOOK_SECRET verification yet — add svix when volume warrants it.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const type    = payload?.type as string | undefined;

    if (!type) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_type' });
    }

    // ── Extract recipient email ───────────────────────────────────────────
    // Resend payload shape: data.to = ['email@example.com']
    const toField = payload?.data?.to;
    const email   = Array.isArray(toField)
      ? (toField[0] as string)
      : (payload?.data?.email as string | undefined);

    if (!email) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_email' });
    }

    const now          = new Date().toISOString();
    const cleanEmail   = email.trim().toLowerCase();

    // ── email.bounced ─────────────────────────────────────────────────────
    if (type === 'email.bounced') {
      const bounceType = (payload?.data?.bounce?.type as string) || 'hard';
      await supabase
        .from('email_validity')
        .upsert([{
          email:       cleanEmail,
          status:      'bounced',
          bounced_at:  now,
          bounce_type: bounceType,
          source:      'resend_webhook',
          updated_at:  now,
        }], { onConflict: 'email' });

      return NextResponse.json({ ok: true, action: 'bounced', email: cleanEmail, bounceType });
    }

    // ── email.complained — spam report ────────────────────────────────────
    if (type === 'email.complained') {
      await supabase
        .from('email_validity')
        .upsert([{
          email:       cleanEmail,
          status:      'unsubscribed',
          unsubbed_at: now,
          source:      'resend_webhook_complaint',
          updated_at:  now,
        }], { onConflict: 'email' });

      return NextResponse.json({ ok: true, action: 'complained', email: cleanEmail });
    }

    // ── email.delivered — promote to valid ────────────────────────────────
    if (type === 'email.delivered') {
      await supabase
        .from('email_validity')
        .upsert([{
          email:      cleanEmail,
          status:     'valid',
          checked_at: now,
          source:     'resend_webhook',
          updated_at: now,
        }], { onConflict: 'email' });

      return NextResponse.json({ ok: true, action: 'delivered', email: cleanEmail });
    }

    // ── All other event types — ignore ────────────────────────────────────
    return NextResponse.json({ ok: true, skipped: true, type });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

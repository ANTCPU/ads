// app/api/webhooks/resend/route.ts
// ─── Resend webhook — bounce + complaint + delivery handler ──────────────────
// Resend fires this on email events. Configure in Resend dashboard:
//   Webhooks → Add endpoint → https://antcpu-ads.vercel.app/api/webhooks/resend
//   Events: email.bounced, email.complained, email.delivered
//
// email.bounced
//   soft bounce  → status = 'soft_bounce' — retried after 7 days
//                  soft_bounce_count increments each time
//                  3 soft bounces OR 2 consecutive → promoted to 'bounced'
//   hard bounce  → status = 'bounced' — blocked permanently
//
// email.complained → status = 'unsubscribed' — blocked permanently
//   Spam complaint = treat same as opt-out
//   Gmail/Yahoo penalise senders who ignore complaints
//
// email.delivered  → status = 'valid'
//   Confirmed deliverable — resets consecutive_bounces
//   Safe for primary and secondary lists
//
// New domain / DNS propagation (e.g. tutamail.com):
//   First bounce = soft — retried next Monday
//   Delivers after DNS propagates = promoted to valid
//   Never hard-blocked until 2 consecutive or 3 total soft bounces
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
    const toField = payload?.data?.to;
    const email   = Array.isArray(toField)
      ? (toField[0] as string)
      : (payload?.data?.email as string | undefined);

    if (!email) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_email' });
    }

    const now        = new Date().toISOString();
    const cleanEmail = email.trim().toLowerCase();

    // ── email.bounced ─────────────────────────────────────────────────────
    if (type === 'email.bounced') {
      const bounceType = (payload?.data?.bounce?.type as string) || 'hard';
      const isSoft     = bounceType === 'soft';

      // Get current record — need counts to decide permanent block
      const { data: existing } = await supabase
        .from('email_validity')
        .select('soft_bounce_count, last_bounce_type, consecutive_bounces')
        .eq('email', cleanEmail)
        .maybeSingle();

      const softCount   = (existing?.soft_bounce_count   || 0) + (isSoft ? 1 : 0);
      const consecutive = (existing?.consecutive_bounces || 0) + 1;

      // Permanent block conditions:
      //   1. Hard bounce — bad address, block immediately
      //   2. 2+ consecutive bounces — repeatedly failing
      //   3. 3+ soft bounces total — address is not recovering
      const permanentBlock = !isSoft || consecutive >= 2 || softCount >= 3;

      await supabase
        .from('email_validity')
        .upsert([{
          email:               cleanEmail,
          status:              permanentBlock ? 'bounced' : 'soft_bounce',
          bounced_at:          now,
          bounce_type:         bounceType,
          soft_bounce_count:   softCount,
          last_bounce_type:    bounceType,
          consecutive_bounces: consecutive,
          source:              'resend_webhook',
          updated_at:          now,
        }], { onConflict: 'email' });

      return NextResponse.json({
        ok:          true,
        action:      permanentBlock ? 'hard_block' : 'soft_bounce',
        email:       cleanEmail,
        bounceType,
        softCount,
        consecutive,
        permanent:   permanentBlock,
      });
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

      return NextResponse.json({
        ok:     true,
        action: 'complained',
        email:  cleanEmail,
      });
    }

    // ── email.delivered — promote to valid ────────────────────────────────
    // Reset consecutive_bounces — clean delivery breaks the streak
    if (type === 'email.delivered') {
      await supabase
        .from('email_validity')
        .upsert([{
          email:               cleanEmail,
          status:              'valid',
          checked_at:          now,
          consecutive_bounces: 0,
          source:              'resend_webhook',
          updated_at:          now,
        }], { onConflict: 'email' });

      return NextResponse.json({
        ok:     true,
        action: 'delivered',
        email:  cleanEmail,
      });
    }

    // ── All other event types — ignore ────────────────────────────────────
    return NextResponse.json({ ok: true, skipped: true, type });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

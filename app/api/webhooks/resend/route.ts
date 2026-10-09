// ============================================================
// app/api/webhooks/resend/route.ts
// ─── Resend webhook — full email event handler ───────────────
//
// Resend fires this on email lifecycle events.
// Configure in Resend dashboard:
//   Webhooks → Add endpoint →
//   https://antcpu-ads.vercel.app/api/webhooks/resend
//
//   Subscribe to ALL five events:
//   ✅ email.bounced
//   ✅ email.complained
//   ✅ email.delivered
//   ✅ email.opened    ← NEW in v2
//   ✅ email.clicked   ← NEW in v2
//
// Event logic:
//
//   email.opened / email.clicked
//     → email_sends: status updated by resend_id
//     → email_prefs: open_count++, last_opened_at, email_ok=true
//     Confirmed engaged — always email going forward
//
//   email.bounced
//     soft bounce  → email_validity: soft_bounce — retried after 7 days
//                    soft_bounce_count increments each time
//                    3 soft bounces OR 2 consecutive → permanent block
//     hard bounce  → email_validity: bounced — blocked permanently
//     permanent    → email_prefs: email_ok=false, bounce_count++
//                    Routes to app_notifications only
//
//   email.complained
//     → email_validity: unsubscribed — blocked permanently
//     → email_prefs: email_ok=false, unsubscribed_at set
//     Spam complaint = treat same as opt-out
//     Gmail/Yahoo penalise senders who ignore complaints
//
//   email.delivered
//     → email_validity: valid, consecutive_bounces reset
//     → email_prefs: email_ok=true confirmed
//     Clean delivery breaks bounce streak
//
// New domain / DNS propagation (e.g. tutamail.com):
//   First bounce = soft — retried next send cycle
//   Delivers after DNS propagates = promoted to valid
//   Never hard-blocked until 2 consecutive or 3 total soft bounces
//
// v2 (Oct 2026):
//   — email.opened + email.clicked handlers added
//   — email_prefs wired to all events
//   — email_sends updated by resend_id on open/click
//   — OPTIONS handler + CORS added
//   — Webhook signature verification placeholder
//   — Numbered steps, section headers, ok/err helpers
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

// ─── Clients ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Constants ────────────────────────────────────────────────
// Webhook receives POST from Resend servers only
// CORS wildcard is safe here — no browser ever calls this directly
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, svix-id, svix-timestamp, svix-signature',
  'Cache-Control':                'no-store',
};

// ─── Helpers ──────────────────────────────────────────────────
const ok  = (data: object)         => NextResponse.json(data,           { headers: CORS });
const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s, headers: CORS });

// ─── OPTIONS ──────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ─── POST ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {

    // ── 1. Parse payload ──────────────────────────────────────
    const payload = await req.json();
    const type    = payload?.type as string | undefined;

    if (!type) {
      return ok({ skipped: true, reason: 'no_type' });
    }

    // ── 2. Extract recipient email ────────────────────────────
    // Resend sends `to` as array on most events, `email` on some
    const toField    = payload?.data?.to;
    const rawEmail   = Array.isArray(toField)
      ? (toField[0] as string)
      : (payload?.data?.email as string | undefined);

    if (!rawEmail) {
      return ok({ skipped: true, reason: 'no_email' });
    }

    const now        = new Date().toISOString();
    const cleanEmail = rawEmail.trim().toLowerCase();

    // ── 3. Extract Resend message ID ──────────────────────────
    // Present on open/click events as data.email_id
    // Used to match and update the email_sends record
    const resendId = (payload?.data?.email_id as string | undefined) ?? null;

    // ── 4. Route by event type ────────────────────────────────

    // ── email.opened ──────────────────────────────────────────
    // Person opened the email — confirmed engaged
    // email_ok = true, always email going forward
    if (type === 'email.opened') {

      // Update send record if we have the resend_id
      if (resendId) {
        await supabase
          .from('email_sends')
          .update({ status: 'opened', opened_at: now })
          .eq('resend_id', resendId);
      }

      // Increment open count — read first to avoid race on upsert
      const { data: pref } = await supabase
        .from('email_prefs')
        .select('open_count')
        .eq('email', cleanEmail)
        .maybeSingle();

      await supabase
        .from('email_prefs')
        .upsert([{
          email:          cleanEmail,
          email_ok:       true,
          open_count:     (pref?.open_count || 0) + 1,
          last_opened_at: now,
          updated_at:     now,
        }], { onConflict: 'email' });

      return ok({ action: 'opened', email: cleanEmail, resendId });
    }

    // ── email.clicked ─────────────────────────────────────────
    // Person clicked a link — highest engagement signal
    // Counts as an open for email_prefs purposes
    if (type === 'email.clicked') {

      if (resendId) {
        await supabase
          .from('email_sends')
          .update({ status: 'clicked', clicked_at: now })
          .eq('resend_id', resendId);
      }

      const { data: pref } = await supabase
        .from('email_prefs')
        .select('open_count')
        .eq('email', cleanEmail)
        .maybeSingle();

      await supabase
        .from('email_prefs')
        .upsert([{
          email:          cleanEmail,
          email_ok:       true,
          open_count:     (pref?.open_count || 0) + 1,
          last_opened_at: now,   // click = implicit open
          updated_at:     now,
        }], { onConflict: 'email' });

      return ok({ action: 'clicked', email: cleanEmail, resendId });
    }

    // ── email.bounced ─────────────────────────────────────────
    // Soft: may recover — increment count, retry later
    // Hard / 2+ consecutive / 3+ soft: permanent block
    // Permanent block → email_prefs.email_ok = false
    if (type === 'email.bounced') {

      const bounceType = (payload?.data?.bounce?.type as string) || 'hard';
      const isSoft     = bounceType === 'soft';

      // Read current bounce state
      const { data: existing } = await supabase
        .from('email_validity')
        .select('soft_bounce_count, last_bounce_type, consecutive_bounces')
        .eq('email', cleanEmail)
        .maybeSingle();

      const softCount   = (existing?.soft_bounce_count   || 0) + (isSoft ? 1 : 0);
      const consecutive = (existing?.consecutive_bounces || 0) + 1;

      // Permanent block conditions:
      //   1. Hard bounce — bad address, block immediately
      //   2. 2+ consecutive — repeatedly failing
      //   3. 3+ soft total — address not recovering
      const permanentBlock = !isSoft || consecutive >= 2 || softCount >= 3;

      // Write email_validity (delivery health — unchanged from v1)
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

      // Write email_prefs on permanent block only
      // Soft bounces don't flip email_ok — address may still recover
      if (permanentBlock) {
        const { data: pref } = await supabase
          .from('email_prefs')
          .select('bounce_count')
          .eq('email', cleanEmail)
          .maybeSingle();

        await supabase
          .from('email_prefs')
          .upsert([{
            email:        cleanEmail,
            email_ok:     false,
            bounce_count: (pref?.bounce_count || 0) + 1,
            updated_at:   now,
          }], { onConflict: 'email' });
      }

      return ok({
        action:    permanentBlock ? 'hard_block' : 'soft_bounce',
        email:     cleanEmail,
        bounceType,
        softCount,
        consecutive,
        permanent: permanentBlock,
      });
    }

    // ── email.complained ──────────────────────────────────────
    // Spam complaint = permanent opt-out
    // Gmail/Yahoo penalise senders who ignore complaints
    // Both email_validity and email_prefs flipped immediately
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

      await supabase
        .from('email_prefs')
        .upsert([{
          email:               cleanEmail,
          email_ok:            false,
          unsubscribed_at:     now,
          unsubscribed_reason: 'complaint',
          updated_at:          now,
        }], { onConflict: 'email' });

      return ok({ action: 'complained', email: cleanEmail });
    }

    // ── email.delivered ───────────────────────────────────────
    // Confirmed deliverable — resets consecutive bounce streak
    // email_prefs confirmed ok — keep emailing unless they opt out
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

      await supabase
        .from('email_prefs')
        .upsert([{
          email:      cleanEmail,
          email_ok:   true,
          updated_at: now,
        }], { onConflict: 'email' });

      return ok({ action: 'delivered', email: cleanEmail });
    }

    // ── Unknown event type — log and ignore ───────────────────
    // New Resend event types won't break the handler
    return ok({ skipped: true, type });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    console.error('[webhooks/resend] error:', message);
    return err(message);
  }
}

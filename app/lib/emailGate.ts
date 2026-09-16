// app/lib/emailGate.ts
// ─── Email gate — validity + quota + idempotency ──────────────────────────────
//
// Resend Free:  100 emails/day · 3,000/month
//
// Budget allocation:
//   transactional → 30/day  (welcome, champion, internship)
//   digest        → 70/day  (weekly digest — fires one day/week)
//
// Every heraldSend() caller must:
//   1. checkEmailGate()  — get allow/reason
//   2. if !allow → gatedNotify() + return early
//   3. if allow  → heraldSend() → recordEmailSent() → logEmailSend()
//
// Validity check runs before quota — bounced/unsubscribed never burn quota.
// Validity is written by:
//   /api/webhooks/resend  → bounce + complaint events
//   /api/unsubscribe      → user-initiated opt-out
//
// ⚠️  SERVER-ONLY — never import from client components.
// ─────────────────────────────────────────────────────────────────────────────

import 'server-only';

// ─── Hard limits ──────────────────────────────────────────────────────────────

export const EMAIL_LIMITS = {
  DAILY_HARD_CAP:       100,
  DAILY_TRANSACTIONAL:   30,
  DAILY_DIGEST:          70,
  MONTHLY_CAP:         3000,
  MIN_ACCOUNT_AGE_DAYS:   7,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailType      = 'transactional' | 'digest';
export type ValidityStatus = 'unknown' | 'valid' | 'invalid' | 'bounced' | 'unsubscribed';

export type GateResult =
  | { allow: true;  reason: 'ok' }
  | { allow: false; reason: 'bounced' | 'unsubscribed' | 'too_new' | 'daily_cap' | 'monthly_cap' | 'already_sent' };

// ─── checkEmailValidity ───────────────────────────────────────────────────────
// Reads email_validity table — populated by Resend webhooks + unsubscribe route.
// 'unknown' and 'valid' both pass — we don't block unverified addresses.
// 'bounced' and 'unsubscribed' block before any quota is checked.

export async function checkEmailValidity(
  supabase: any,
  email:    string,
): Promise<ValidityStatus> {
  const { data } = await supabase
    .from('email_validity')
    .select('status')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return (data?.status || 'unknown') as ValidityStatus;
}

// ─── checkEmailGate ───────────────────────────────────────────────────────────
// Call before every heraldSend().
//
// supabase  — service role client (already init'd in each route)
// email     — recipient address
// type      — 'transactional' | 'digest'
// guardCol  — optional ad_signups column for idempotency
//             e.g. 'welcome_email_sent_at' → blocks duplicate welcome emails

export async function checkEmailGate(
  supabase:  any,
  email:     string,
  type:      EmailType,
  guardCol?: string,
): Promise<GateResult> {

  // ── Step 0 — validity check ───────────────────────────────────────────────
  // Bounced + unsubscribed never reach quota check — never burn send budget.
  const validity = await checkEmailValidity(supabase, email);
  if (validity === 'bounced')      return { allow: false, reason: 'bounced'      };
  if (validity === 'unsubscribed') return { allow: false, reason: 'unsubscribed' };

  // ── Step 1 — fetch user record ────────────────────────────────────────────
  const cols = [
    'created_at',
    'emails_sent_today',
    'emails_sent_month',
    'last_email_date',
    ...(guardCol ? [guardCol] : []),
  ].join(', ');

  const { data: user } = await supabase
    .from('ad_signups')
    .select(cols)
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  // Unknown user — treat as too new, never burn quota
  if (!user) return { allow: false, reason: 'too_new' };

  // ── Step 2 — account age ──────────────────────────────────────────────────
  const ageDays = (Date.now() - new Date(user.created_at).getTime())
    / (1000 * 60 * 60 * 24);
  if (ageDays < EMAIL_LIMITS.MIN_ACCOUNT_AGE_DAYS) {
    return { allow: false, reason: 'too_new' };
  }

  // ── Step 3 — idempotency guard ────────────────────────────────────────────
  if (guardCol && user[guardCol]) {
    return { allow: false, reason: 'already_sent' };
  }

  // ── Step 4 — daily budget ─────────────────────────────────────────────────
  const today     = new Date().toISOString().slice(0, 10);
  const sentToday = user.last_email_date === today
    ? (user.emails_sent_today || 0)
    : 0;
  const budget    = type === 'digest'
    ? EMAIL_LIMITS.DAILY_DIGEST
    : EMAIL_LIMITS.DAILY_TRANSACTIONAL;

  if (sentToday >= budget) return { allow: false, reason: 'daily_cap' };

  // ── Step 5 — monthly cap ──────────────────────────────────────────────────
  if ((user.emails_sent_month || 0) >= EMAIL_LIMITS.MONTHLY_CAP) {
    return { allow: false, reason: 'monthly_cap' };
  }

  return { allow: true, reason: 'ok' };
}

// ─── recordEmailSent ──────────────────────────────────────────────────────────
// Call immediately after a successful heraldSend().
// Increments per-user counters so the gate stays accurate across all routes.

export async function recordEmailSent(
  supabase: any,
  email:    string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: user } = await supabase
    .from('ad_signups')
    .select('emails_sent_today, emails_sent_month, last_email_date')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (!user) return;

  const isNewDay  = user.last_email_date !== today;
  const sentToday = isNewDay ? 1 : (user.emails_sent_today  || 0) + 1;
  const sentMonth = (user.emails_sent_month || 0) + 1;

  await supabase
    .from('ad_signups')
    .update({
      emails_sent_today: sentToday,
      emails_sent_month: sentMonth,
      last_email_date:   today,
    })
    .eq('email', email.trim().toLowerCase());
}

// ─── logEmailSend ─────────────────────────────────────────────────────────────
// Call after recordEmailSent() — writes one row to email_sends.
// Gives full per-user send history. Powers dedup + audit trail.
// Also marks email_validity as 'valid' on first confirmed send.

export async function logEmailSend(
  supabase:  any,
  email:     string,
  template:  string,
  opts?: {
    segment?:       string;
    subject?:       string;
    locale?:        string;
    digestRunId?:   string;
    status?:        'sent' | 'failed' | 'skipped';
    skipReason?:    string;
  },
): Promise<void> {
  const now = new Date().toISOString();

  // Write send log row
  await supabase.from('email_sends').insert([{
    email,
    template,
    segment:       opts?.segment    || null,
    subject:       opts?.subject    || null,
    locale:        opts?.locale     || 'en',
    digest_run_id: opts?.digestRunId || null,
    status:        opts?.status     || 'sent',
    skip_reason:   opts?.skipReason || null,
    created_at:    now,
  }]);

  // Mark address as valid on first confirmed send — Resend accepted it
  if (!opts?.status || opts.status === 'sent') {
    await supabase
      .from('email_validity')
      .upsert([{
        email:      email.trim().toLowerCase(),
        status:     'valid',
        checked_at: now,
        source:     'confirmed_send',
        updated_at: now,
      }], { onConflict: 'email' });
  }
}

// ─── logSkippedSend ───────────────────────────────────────────────────────────
// Call when gate.allow === false — records the skip so we know what was blocked.
// Does not increment quota counters — skipped sends don't count against budget.

export async function logSkippedSend(
  supabase:   any,
  email:      string,
  template:   string,
  skipReason: string,
  opts?: {
    segment?: string;
    locale?:  string;
  },
): Promise<void> {
  await supabase.from('email_sends').insert([{
    email,
    template,
    segment:     opts?.segment || null,
    locale:      opts?.locale  || 'en',
    status:      'skipped',
    skip_reason: skipReason,
    created_at:  new Date().toISOString(),
  }]);
}

// ─── gatedNotify ─────────────────────────────────────────────────────────────
// Fires in-app notification when email is gated.
// Always call when gate.allow === false so user still gets the signal.
// Skip for bounced/unsubscribed — they opted out of all comms.
//
// type maps to NOTIF_COLOR in ArenaNav:
//   'nudge' | 'info' | 'approved' | 'rejected' | 'points' | 'rank' | 'aria'

export async function gatedNotify(
  supabase: any,
  email:    string,
  title:    string,
  message:  string,
  type = 'nudge',
): Promise<void> {
  await supabase.from('notifications').insert([{
    email:   email.trim().toLowerCase(),
    type,
    title,
    message,
    read:    false,
  }]);
}

// ─── shouldNotify ─────────────────────────────────────────────────────────────
// Helper — returns false for bounced/unsubscribed so callers don't fire
// in-app notifications to users who have fully opted out.

export function shouldNotify(reason: GateResult['reason']): boolean {
  return reason !== 'bounced' && reason !== 'unsubscribed';
}

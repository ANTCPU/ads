// app/lib/emailGate.ts
// ─── Email gate — built around Resend Free plan hard limits ──────────────────
//
// Resend Free:  100 emails/day · 3,000/month · no daily limit on paid
//
// Budget allocation (Free tier):
//   transactional  → 30/day  (welcome, champion, internship)
//   digest         → 70/day  (weekly digest — fires one day/week)
//
// Every heraldSend() caller must:
//   1. call checkEmailGate()  — get allow/reason
//   2. if !allow → insert notification + discord ping, return early
//   3. if allow  → heraldSend(), then recordEmailSent()
//
// Supabase columns required on ad_signups:
//   emails_sent_today  int  default 0
//   emails_sent_month  int  default 0
//   last_email_date    date
//
// ⚠️  SERVER-ONLY — never import from client components.
// ─────────────────────────────────────────────────────────────────────────────

import 'server-only';

// ─── Hard limits ──────────────────────────────────────────────────────────────

export const EMAIL_LIMITS = {
  DAILY_HARD_CAP:       100,   // Resend Free absolute ceiling
  DAILY_TRANSACTIONAL:   30,   // welcome + champion + internship
  DAILY_DIGEST:          70,   // weekly digest (one day/week)
  MONTHLY_CAP:         3000,   // Resend Free monthly
  MIN_ACCOUNT_AGE_DAYS:   7,   // must be 7 days old to receive email
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailType = 'transactional' | 'digest';

export type GateResult =
  | { allow: true;  reason: 'ok' }
  | { allow: false; reason: 'too_new' | 'daily_cap' | 'monthly_cap' | 'already_sent' };

// ─── checkEmailGate ───────────────────────────────────────────────────────────
// Call before every heraldSend().
//
// supabase  — service role client (already init'd in each route)
// email     — recipient address
// type      — 'transactional' | 'digest'
// guardCol  — optional ad_signups column to check for idempotency
//             e.g. 'welcome_email_sent_at' → blocks duplicate welcome emails

export async function checkEmailGate(
  supabase:  any,
  email:     string,
  type:      EmailType,
  guardCol?: string,
): Promise<GateResult> {

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

  // 1. Account age — must be 7+ days
  const ageMs   = Date.now() - new Date(user.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < EMAIL_LIMITS.MIN_ACCOUNT_AGE_DAYS) {
    return { allow: false, reason: 'too_new' };
  }

  // 2. Idempotency guard — e.g. welcome already sent
  if (guardCol && user[guardCol]) {
    return { allow: false, reason: 'already_sent' };
  }

  // 3. Reset daily counter if last email was a different calendar day
  const today     = new Date().toISOString().slice(0, 10);
  const sentToday = user.last_email_date === today
    ? (user.emails_sent_today || 0)
    : 0;

  // 4. Daily budget by type
  const budget = type === 'digest'
    ? EMAIL_LIMITS.DAILY_DIGEST
    : EMAIL_LIMITS.DAILY_TRANSACTIONAL;

  if (sentToday >= budget) {
    return { allow: false, reason: 'daily_cap' };
  }

  // 5. Monthly cap
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

// ─── gatedNotify ─────────────────────────────────────────────────────────────
// Convenience — fires in-app notification when email is gated.
// Always call this when gate.allow === false so the user still gets the signal.
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

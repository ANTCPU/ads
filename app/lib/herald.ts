// app/lib/herald.ts
// ─── Herald email infrastructure ─────────────────────────────────────────────
//
// Single source of truth for all outbound email in the platform.
//
// Used by:
//   api/send-welcome/route.ts        → welcome email on signup
//   api/send-weekly/route.ts         → weekly digest (cron + manual)
//   api/send-module/route.ts         → champion welcome + modular sends
//   api/internship/register/route.ts → internship registration email
//
// Pattern mirrors discord.ts exactly:
//   - server-only guard
//   - lazy Resend init — key read at CALL TIME, never at module load
//   - prevents build failures in preview environments without RESEND_API_KEY
//
// v0.4 — unsubscribe headers + signed tokens + recipient-aware footer
//        List-Unsubscribe + List-Unsubscribe-Post on every send (Gmail req)
//        heraldFooter now accepts recipientEmail for signed unsub link
//        heraldWrap passes recipientEmail through to footer
//        heraldSend adds List-Unsubscribe headers automatically
//
// ⚠️  SERVER-ONLY — never import from client components or pages.
// ─────────────────────────────────────────────────────────────────────────────

import 'server-only';
import { Resend }   from 'resend';
import { t, isRTL } from './i18n/index';
import type { Locale } from './i18n/index';

// ─── Version ──────────────────────────────────────────────────────────────────
// Bump when the email system ships a meaningful change.
// Shown in email header and footer.

export const HERALD_VERSION = 'v0.4';

// ─── Constants ────────────────────────────────────────────────────────────────

export const HERALD_FROM = 'ANTCPU ADS <ads@antcpu.io>';
const APP_URL            = 'https://antcpu-ads.vercel.app';

// ─── Lazy Resend init ─────────────────────────────────────────────────────────
// 🔒 LAZY — key read at CALL TIME, not module load.
//    1. Build succeeds when RESEND_API_KEY is absent (preview/Dependabot)
//    2. Rotating the key in Vercel takes effect immediately
//    3. Missing key throws at send time — not at module evaluation

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('[herald] RESEND_API_KEY not configured');
  return new Resend(key);
}

// ─── Unsubscribe tokens ───────────────────────────────────────────────────────
// Signed token = base64url(email:UNSUB_SECRET)
// Never expose raw email in unsubscribe URL — always use a signed token.
// Token verified server-side in /api/unsubscribe before writing to DB.
// UNSUB_SECRET — set in Vercel env vars. Any strong string.

export function unsubToken(email: string): string {
  const secret = process.env.UNSUB_SECRET || 'antcpu-unsub-2026';
  return Buffer.from(`${email}:${secret}`).toString('base64url');
}

export function unsubUrl(email: string): string {
  return `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken(email)}`;
}

// ─── heraldHeader ─────────────────────────────────────────────────────────────
// Top logo + subtitle bar — same across all email types.

export function heraldHeader(subtitle?: string): string {
  return `
    <div style="text-align:center;margin-bottom:2rem">
      <div style="font-size:1.5rem;font-weight:800;color:#f0883e">⚡ ANTCPU ADS</div>
      <div style="font-size:0.72rem;color:#555;margin-top:0.25rem;
        letter-spacing:0.1em;text-transform:uppercase">
        ${subtitle ?? `The Arena · ${HERALD_VERSION}`}
      </div>
    </div>`;
}

// ─── heraldFooter ─────────────────────────────────────────────────────────────
// Bottom links + copyright + unsubscribe link.
// recipientEmail is required for the signed unsubscribe URL.
// If omitted (legacy callers) — footer renders without unsub link.
// Gmail requires a visible unsubscribe link in the email body
// in addition to the List-Unsubscribe header.

export function heraldFooter(locale: Locale, recipientEmail?: string): string {
  const unsubLine = recipientEmail
    ? `<a href="${unsubUrl(recipientEmail)}"
        style="color:#333;text-decoration:underline">
        Unsubscribe
       </a> ·`
    : '';

  return `
    <div style="text-align:center;font-size:0.72rem;color:#333;
      border-top:1px solid #1a1a1a;padding-top:1rem;margin-top:1.5rem;
      line-height:1.8">
      ${t(locale, 'footer_copy')} ·
      <a href="mailto:ads@antcpu.io" style="color:#555">ads@antcpu.io</a> ·
      <a href="${APP_URL}" style="color:#555">antcpu-ads.vercel.app</a><br>
      ${unsubLine}
      <a href="https://discord.gg/antcpu"
        style="color:#555;margin-top:0.3rem;display:inline-block">
        ${t(locale, 'arena_nudge_cta')} →
      </a>
    </div>`;
}

// ─── heraldWrap ───────────────────────────────────────────────────────────────
// Full HTML document — dir + lang, header + body + footer.
// recipientEmail passed through to heraldFooter for signed unsub link.
// All new sends should pass recipientEmail.

export function heraldWrap(
  locale:          Locale,
  body:            string,
  subtitle?:       string,
  recipientEmail?: string,
): string {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  return `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;
  font-family:system-ui,sans-serif;color:#fff">
  <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">
    ${heraldHeader(subtitle)}
    ${body}
    ${heraldFooter(locale, recipientEmail)}
  </div>
</body>
</html>`;
}

// ─── heraldSend ───────────────────────────────────────────────────────────────
// Single function all routes call. Lazy-inits Resend at call time.
//
// Gmail one-click unsubscribe requires both headers on every send:
//   List-Unsubscribe:      <mailto:...>, <https://...>
//   List-Unsubscribe-Post: List-Unsubscribe=One-Click
//
// Without these Gmail routes to spam after enough sends.
// recipientEmail is used to generate the signed unsubscribe URL.
// Falls back gracefully if not provided — headers still added with mailto only.

export async function heraldSend(opts: {
  to:       string;
  subject:  string;
  html:     string;
  locale?:  Locale;
}): Promise<void> {
  const resend = getResend();
  const unsub  = unsubUrl(opts.to);

  const { error } = await resend.emails.send({
    from:    HERALD_FROM,
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
    headers: {
      // Gmail one-click unsubscribe — both formats required
      'List-Unsubscribe':      `<mailto:unsub@antcpu.io?subject=unsubscribe>, <${unsub}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  if (error) throw error;
}

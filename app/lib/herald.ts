// ─────────────────────────────────────────────────────────────────────────────
// app/lib/herald.ts — Herald email infrastructure
//
// Herald is the single source of truth for all outbound email in the platform.
// Used by:
//   api/send-welcome/route.ts       → welcome email on signup
//   api/send-weekly/route.ts        → weekly digest (cron + manual)
//   api/internship/register/route.ts → internship registration email
//
// Pattern mirrors discord.ts exactly:
//   - server-only guard
//   - lazy Resend init — key read at CALL TIME, never at module load
//   - prevents build failures in preview environments without RESEND_API_KEY
//
// ⚠️  SERVER-ONLY — never import this file from a client component or page.
// ─────────────────────────────────────────────────────────────────────────────

import 'server-only';
import { Resend }   from 'resend';
import { t, isRTL } from './i18n/index';
import type { Locale } from './i18n/index';

// ─── Version ──────────────────────────────────────────────────────────────────
// Bump this when the email system ships a meaningful change.
// Shown in the welcome email header and footer.
// v0.3.0 — Herald infrastructure + 12-locale passive language system

export const HERALD_VERSION = 'v0.3';

// ─── Sender identity ──────────────────────────────────────────────────────────

export const HERALD_FROM = 'ANTCPU ADS <ads@antcpu.io>';

// ─── Lazy Resend init ─────────────────────────────────────────────────────────
// 🔒 LAZY — key is read from env at CALL TIME, not module load time.
//    Same pattern as discord.ts getWebhook().
//    This means:
//    1. Build succeeds even when RESEND_API_KEY is absent (preview/Dependabot)
//    2. Rotating the key in Vercel takes effect immediately
//    3. A missing key throws at send time — not at module evaluation

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('[herald] RESEND_API_KEY not configured');
  return new Resend(key);
}

// ─── Shared email chrome ──────────────────────────────────────────────────────
// heraldHeader  — top logo + subtitle bar
// heraldFooter  — bottom links + copyright, locale-aware
// heraldWrap    — full HTML document with dir + lang, header + body + footer

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

export function heraldFooter(locale: Locale): string {
  return `
    <div style="text-align:center;font-size:0.72rem;color:#333;
      border-top:1px solid #1a1a1a;padding-top:1rem;margin-top:1.5rem">
      ${t(locale, 'footer_copy')} ·
      <a href="mailto:ads@antcpu.io" style="color:#555">ads@antcpu.io</a> ·
      <a href="https://antcpu-ads.vercel.app" style="color:#555">
        antcpu-ads.vercel.app
      </a><br>
      <a href="https://discord.gg/antcpu" style="color:#555;margin-top:0.3rem;
        display:inline-block">
        ${t(locale, 'arena_nudge_cta')} →
      </a>
    </div>`;
}

export function heraldWrap(
  locale:    Locale,
  body:      string,
  subtitle?: string,
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
    ${heraldFooter(locale)}
  </div>
</body>
</html>`;
}

// ─── Core send function ───────────────────────────────────────────────────────
// Single function all routes call. Lazy-inits Resend at call time.
// locale is optional — used for logging only, not for content here.

export async function heraldSend(opts: {
  to:       string;
  subject:  string;
  html:     string;
  locale?:  Locale;
}): Promise<void> {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from:    HERALD_FROM,
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
  });
  if (error) throw error;
}

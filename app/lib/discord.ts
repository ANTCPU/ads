// app/lib/discord.ts
// ─── Discord — structured embeds, event routing ───────────────────────────────
//
// Webhook routing:
//   intern_registered |
//   intern_closed     |
//   intern_gate       |
//   intern_submission |
//   intern_message    |
//   intern_badge      |
//   intern_digest     |
//   internship (deprecated)                 → DISCORD_INTERN
//   new_champion                            → DISCORD_WEBHOOK_CHAMPIONS
//   share | click_milestone                 → DISCORD_WEBHOOK_SHARES
//   new_signup | flag_toggle |
//   ad_approved | ad_rejected |
//   ad_archived | aria_review |
//   aria_auto_approved | aria_flagged |
//   new_brand | tix_event | general         → DISCORD_WEBHOOK_ADS
//   photo_lead | photo_booking              → DISCORD_WEBHOOK_MANDA_PHOTO
//   photo_error                             → DISCORD_WEBHOOK_MANDA_HOOKS
//   edu_nudge                               → DISCORD_WEBHOOK_EDU
//
// tix_event will route to DISCORD_WEBHOOK_TIX when that env var is set.
// Falls back to DISCORD_WEBHOOK_ADS automatically — no config change needed now.
//
// Usage — general:
//   await notifyDiscord('', 'new_signup', embed);
//   await notifyDiscord('', 'flag_toggle', embed);
//   await notifyDiscord('', 'tix_event', embed);
//
// Usage — internship structured events (preferred):
//   await notifyInternship('intern_registered', {
//     title:  '🎯 New Challenger — Ritik K.',
//     color:  DC.intern,
//     url:    'https://antcpu.io/office/?h=ritik-k',
//     fields: [
//       { name: 'Track',   value: '💻 Dev',  inline: true },
//       { name: 'Country', value: 'India',   inline: true },
//     ],
//     footer: 'october-2026 · Day 7',
//   });
//
// Usage — tix events:
//   await notifyTix('tix_event', {
//     title:  '🎫 ADS-0001 — Assigned',
//     color:  DC.purple,
//     url:    'https://antcpu-ads.vercel.app/health',
//     fields: [
//       { name: 'Ticket',   value: 'ADS-0001',       inline: true },
//       { name: 'Assignee', value: 'ritik@email.com', inline: true },
//       { name: 'Type',     value: 'bug',             inline: true },
//     ],
//     footer: 'tix · october-2026',
//   });
//
// Embed url field — makes the title a clickable link in Discord.
// Embed thumbnail field — small image top-right (brand logo, avatar).
// Both are optional — existing callers unaffected.
//
// ⚠️  SERVER-ONLY — never import this file from a client component or page.
//     Webhook URLs are resolved lazily at call time, never at module load.
//
// v6 (Oct 2026):
//   — tix_event added → DISCORD_WEBHOOK_TIX ?? DISCORD_WEBHOOK_ADS
//   — notifyTix() helper added — mirrors notifyInternship()
//   — url field added to DiscordEmbed — clickable embed titles
//   — thumbnail field added to DiscordEmbed — brand image support
//   — url + thumbnail wired into notifyDiscord() body builder
//   — duplicate 'new_brand' removed from type union + switch
//   — DC.tix mapped to DC.purple in color reference
//   — 'internship' marked @deprecated in type union
//   — Header comment updated with tix routing + url/thumbnail docs
//
// v5 (Oct 2026):
//   — 7 internship event types added
//   — notifyInternship() helper added
//   — DC palette extended: teal, yellow, dark
//
// v4 (Sep 2026):
//   — edu_nudge → DISCORD_WEBHOOK_EDU
//
// v3 (Sep 2026):
//   — photo_lead, photo_booking → DISCORD_WEBHOOK_MANDA_PHOTO
//   — photo_error               → DISCORD_WEBHOOK_MANDA_HOOKS
//
// v2 (Sep 2026):
//   — new_signup explicit routing
//   — click_milestone → DISCORD_WEBHOOK_SHARES
//   — flag_toggle added
// ─────────────────────────────────────────────────────────────────────────────

import 'server-only'; // 🔒 Hard stop — Next.js will throw a build error
                      //    if this file is ever imported client-side

import type { Platform, ShareContext } from './socialShare';
import { EMOJI }              from './content/emojis';
import { championPrefixBold } from './content/templates';

// ─── Event types ──────────────────────────────────────────────────────────────
// Add new events here when a new Discord notification type is needed.
// Every event must also be added to getWebhook() below.

export type DiscordEvent =
  // ── Internship — all route to DISCORD_INTERN ──────────────
  | 'intern_registered'  // New challenger registered (Day 1–6)
  | 'intern_closed'      // Applicant redirected to next cohort (Day 7+)
  | 'intern_early_access' // Registered into next cohort with early access
  | 'intern_gate'        // Gate completed — role may have changed
  | 'intern_submission'  // Work submitted to wall/showcase
  | 'intern_message'     // Direct message sent to owner
  | 'intern_badge'       // Badge awarded to challenger
  | 'intern_digest'      // Daily cohort snapshot — cron midnight EST
  /** @deprecated use structured intern_* events instead */
  | 'internship'         // Legacy plain-text — kept for old callers
  // ── Arena / Ads ───────────────────────────────────────────
  | 'new_champion'       // New country champion signup   → DISCORD_WEBHOOK_CHAMPIONS
  | 'share'              // Ad share events               → DISCORD_WEBHOOK_SHARES
  | 'click_milestone'    // Click count milestones        → DISCORD_WEBHOOK_SHARES
  | 'new_signup'         // New user signup               → DISCORD_WEBHOOK_ADS
  | 'flag_toggle'        // Feature flag flipped          → DISCORD_WEBHOOK_ADS
  | 'ad_approved'        // Ad approved by admin          → DISCORD_WEBHOOK_ADS
  | 'ad_rejected'        // Ad rejected by admin          → DISCORD_WEBHOOK_ADS
  | 'ad_archived'        // Ad archived by admin          → DISCORD_WEBHOOK_ADS
  | 'aria_review'        // First ad queued for review    → DISCORD_WEBHOOK_ADS
  | 'aria_auto_approved' // Subsequent ad auto-approved   → DISCORD_WEBHOOK_ADS
  | 'aria_flagged'       // Subsequent ad flagged by Aria → DISCORD_WEBHOOK_ADS
  | 'new_brand'          // New brand registered          → DISCORD_WEBHOOK_ADS
  // ── Tix ───────────────────────────────────────────────────
  | 'tix_event'          // Ticket created/updated        → DISCORD_WEBHOOK_TIX ?? ADS
  // ── Photography ───────────────────────────────────────────
  | 'photo_lead'         // Amanda partial lead           → DISCORD_WEBHOOK_MANDA_PHOTO
  | 'photo_booking'      // Amanda full booking           → DISCORD_WEBHOOK_MANDA_PHOTO
  | 'photo_error'        // Amanda system error           → DISCORD_WEBHOOK_MANDA_HOOKS
  // ── EDU ───────────────────────────────────────────────────
  | 'edu_nudge'          // EDU herald + completions      → DISCORD_WEBHOOK_EDU
  // ── Catch-all ─────────────────────────────────────────────
  | 'general';           // Catch-all                     → DISCORD_WEBHOOK_ADS

// ─── Embed types ──────────────────────────────────────────────────────────────
// url       — makes the embed title a clickable hyperlink in Discord
// thumbnail — small image displayed top-right of the embed
// Both are optional — existing callers unaffected

export type DiscordField = {
  name:    string;
  value:   string;
  inline?: boolean;
};

export type DiscordEmbed = {
  title:        string;
  description?: string;
  url?:         string;              // clickable title link
  color:        number;
  fields?:      DiscordField[];
  footer?:      string;
  timestamp?:   boolean;
  thumbnail?:   { url: string };     // brand logo / avatar — top-right
};

// ─── Color palette ────────────────────────────────────────────────────────────
// Use DC.color when building embeds — keeps colors consistent across all events.
//
// Quick reference:
//   intern_registered → DC.intern   (blue)
//   intern_closed     → DC.grey     (neutral)
//   intern_gate       → DC.green    (completion)
//   intern_submission → DC.blue     (info)
//   intern_message    → DC.teal     (comms)
//   intern_badge      → DC.yellow   (achievement)
//   intern_digest     → DC.dark     (system/cron)
//   ad_approved       → DC.green
//   ad_rejected       → DC.red
//   ad_archived       → DC.orange
//   new_champion      → DC.gold
//   edu_nudge         → DC.edu
//   tix_event         → DC.purple   (engineering/ops)

export const DC = {
  green:  0x2E7D32,  // approvals, gate completions, success
  gold:   0xD4AF37,  // champions, highlights
  blue:   0x0070F3,  // info, clicks, submissions
  orange: 0xF0883E,  // ANTCPU brand, archive
  red:    0xEF4444,  // rejections, errors
  purple: 0x7928CA,  // tix events, rising tier, engineering ops
  grey:   0x555555,  // neutral, system, closed cohort
  intern: 0x2563EB,  // internship challenge accent — new registrations
  edu:    0x22C55E,  // EDU — green matches MAC + lesson complete UI
  teal:   0x0D9488,  // direct messages, comms
  yellow: 0xEAB308,  // badges, achievements, warnings
  dark:   0x1E293B,  // daily digest, cron events, system snapshots
};

// ─── Webhook resolver ─────────────────────────────────────────────────────────
// 🔒 LAZY — URLs are read from env at CALL TIME, not module load time.
//    1. No URL is ever stored in a JS object that could be serialised
//    2. Rotating a webhook URL in Vercel takes effect immediately
//    3. A missing var returns undefined cleanly — no crash, no exposure

function getWebhook(event?: DiscordEvent): string | undefined {
  switch (event) {
    // ── Internship — all structured events → DISCORD_INTERN ──
    case 'intern_registered':
    case 'intern_closed':
    case 'intern_gate':
    case 'intern_submission':
    case 'intern_message':
    case 'intern_badge':
    case 'intern_digest':
    case 'internship':           // @deprecated — legacy plain-text fallback
      return process.env.DISCORD_INTERN;

    case 'new_champion':
      return process.env.DISCORD_WEBHOOK_CHAMPIONS;

    case 'share':
    case 'click_milestone':      // engagement signals — same channel as shares
      return process.env.DISCORD_WEBHOOK_SHARES;

    case 'photo_lead':
    case 'photo_booking':        // Amanda Photography — bookings channel
      return process.env.DISCORD_WEBHOOK_MANDA_PHOTO;

    case 'photo_error':          // Amanda Photography — dev/errors channel
      return process.env.DISCORD_WEBHOOK_MANDA_HOOKS;

    case 'edu_nudge':            // EDU herald + lesson completions → #edu
      return process.env.DISCORD_WEBHOOK_EDU;

    case 'tix_event':            // Ticket ops — own channel when ready
      return process.env.DISCORD_WEBHOOK_TIX ?? process.env.DISCORD_WEBHOOK_ADS;

    case 'new_brand':
    case 'new_signup':           // explicit — was silently falling to general
    case 'flag_toggle':          // ops visibility — admin actions auditable
    default:
      return process.env.DISCORD_WEBHOOK_ADS;
  }
}

// ─── Core sender ──────────────────────────────────────────────────────────────
// Sends a message (and optional embed) to the correct Discord webhook.
//
// content  — plain text message (can be empty string '')
// event    — routes to the correct webhook channel
// embed    — optional structured embed with title, fields, color, footer, url

export async function notifyDiscord(
  content:  string,
  event?:   DiscordEvent,
  embed?:   DiscordEmbed,
): Promise<void> {
  try {
    const webhook = getWebhook(event);

    // 🔒 Webhook missing — warn without printing the URL or var name
    if (!webhook) {
      console.warn(`[discord] webhook not configured for event: ${event ?? 'general'}`);
      return;
    }

    const body: Record<string, unknown> = { content };

    if (embed) {
      body.embeds = [{
        title:       embed.title,
        url:         embed.url,              // clickable title — undefined = no link
        description: embed.description,
        color:       embed.color,
        fields:      embed.fields ?? [],
        footer:      embed.footer ? { text: embed.footer } : undefined,
        timestamp:   embed.timestamp ? new Date().toISOString() : undefined,
        thumbnail:   embed.thumbnail ?? undefined,  // brand logo top-right
      }];
    }

    const res = await fetch(webhook, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    // 🔒 Log failure status only — never log the webhook URL
    if (!res.ok) {
      console.warn(`[discord] delivery failed — event: ${event ?? 'general'}, status: ${res.status}`);
    }

  } catch (err) {
    // 🔒 Log that it failed, not what the URL was
    console.warn(`[discord] unexpected error — event: ${event ?? 'general'}`, err);
  }
}

// ─── Internship structured notifier ──────────────────────────────────────────
// Preferred over raw notifyDiscord() for all internship events.
// Always sends an embed. Always timestamps. Never sends plain text.
//
// Callers:
//   register/route.ts   — intern_registered, intern_closed
//   progress/route.ts   — intern_gate, intern_badge
//   submit/route.ts     — intern_submission
//   community/route.ts  — intern_message
//   cron/digest         — intern_digest

export async function notifyInternship(
  event: DiscordEvent,
  embed: DiscordEmbed,
): Promise<void> {
  return notifyDiscord('', event, { ...embed, timestamp: true });
}

// ─── Tix structured notifier ─────────────────────────────────────────────────
// Preferred over raw notifyDiscord() for all ticket events.
// Always sends an embed. Always timestamps. Never sends plain text.
//
// Callers:
//   api/tix/route.ts — tix_event on assigned/open/in_review/closed/rejected
//
// Example:
//   await notifyTix('tix_event', {
//     title:  '🎫 ADS-0001 — Assigned',
//     color:  DC.purple,
//     url:    'https://antcpu-ads.vercel.app/health',
//     fields: [
//       { name: 'Ticket',   value: 'ADS-0001',       inline: true },
//       { name: 'Assignee', value: 'ritik@email.com', inline: true },
//       { name: 'Type',     value: 'bug',             inline: true },
//       { name: 'Title',    value: 'Fix scout loop',  inline: false },
//     ],
//     footer: 'tix · october-2026',
//   });

export async function notifyTix(
  event: DiscordEvent,
  embed: DiscordEmbed,
): Promise<void> {
  return notifyDiscord('', event, { ...embed, timestamp: true });
}

// ─── Discord platform — for social share system ───────────────────────────────
// Implements the Platform interface from socialShare.ts.
// Used by share buttons across the Arena, champion posts, and activity feeds.
// ⚠️  This section contains NO env vars — safe to use in shared lib files.

export const discordPlatform: Platform = {
  key:            'discord',
  label:          'Discord',
  icon:           '💬',
  color:          '#5865F2',
  supportsIntent: false,
  profileUrl:     h => `https://discord.gg/${h}`,
  intentUrl:      () => '',
  buildPost: (ctx: ShareContext) =>
    `${championPrefixBold(ctx)}**${ctx.brand}** is live in the Arena ${EMOJI.live}\n` +
    `> ${ctx.title}\n` +
    `> ${ctx.description.slice(0, 120)}\n` +
    `→ ${ctx.url}`,
};

// ============================================================
// EOF META
// ============================================================
// File    : app/lib/discord.ts
// Version : v6
// Updated : 2026-10-19
//
// PURPOSE:
//   Discord notification layer — all ops alerts route here.
//   Sends structured embeds to configured webhook channels.
//
// KEY FUNCTIONS:
//   notifyDiscord       — generic embed dispatcher
//   intern_closed       — challenger completed internship
//   intern_registered   — new challenger registered
//   ad_created          — new ad submitted
//   ad_archived         — ad archived by user
//   nudge_sent          — nudge email dispatched
//   nudge_skipped       — nudge skipped (gate/cooldown)
//
// AGENTS:
//   Discord — this file (v6)
// ============================================================

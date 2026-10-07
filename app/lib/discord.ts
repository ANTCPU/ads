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
//   internship                              → DISCORD_INTERN
//   new_champion                            → DISCORD_WEBHOOK_CHAMPIONS
//   share | click_milestone                 → DISCORD_WEBHOOK_SHARES
//   new_signup | flag_toggle |
//   ad_approved | ad_rejected |
//   ad_archived | aria_review |
//   aria_auto_approved | aria_flagged |
//   general                                 → DISCORD_WEBHOOK_ADS
//   photo_lead | photo_booking              → DISCORD_WEBHOOK_MANDA_PHOTO
//   photo_error                             → DISCORD_WEBHOOK_MANDA_HOOKS
//   edu_nudge                               → DISCORD_WEBHOOK_EDU
//
// Usage — general:
//   await notifyDiscord(content, 'internship');
//   await notifyDiscord(content, 'ad_approved', embed);
//   await notifyDiscord('', 'new_signup', embed);
//   await notifyDiscord('', 'flag_toggle', embed);
//   await notifyDiscord('', 'photo_booking', embed);
//   await notifyDiscord('', 'edu_nudge', embed);
//
// Usage — internship structured events (preferred over raw notifyDiscord):
//   await notifyInternship('intern_registered', {
//     title:  '🎯 New Challenger — Ritik K.',
//     color:  DC.intern,
//     fields: [
//       { name: 'Track',   value: '💻 Dev',  inline: true },
//       { name: 'Country', value: 'India',   inline: true },
//       { name: 'Status',  value: '⭐ Founding Member', inline: true },
//     ],
//     footer: 'october-2026 · Day 7',
//   });
//
//   await notifyInternship('intern_gate', {
//     title:  '✅ Gate Complete — Sreenidh B.',
//     color:  DC.green,
//     fields: [
//       { name: 'Gate',     value: 'd2 — Complete Your Profile', inline: true },
//       { name: 'Progress', value: '10%',                        inline: true },
//       { name: 'Role',     value: '🤖 AI Tool User',            inline: true },
//     ],
//     footer: 'october-2026 · Week 1',
//   });
//
//   await notifyInternship('intern_digest', {
//     title:  '📊 Daily Digest — October 2026',
//     color:  DC.dark,
//     fields: [
//       { name: 'Active Today',  value: '12',  inline: true },
//       { name: 'Gates Done',    value: '8',   inline: true },
//       { name: 'Submissions',   value: '3',   inline: true },
//       { name: 'Drop-offs',     value: '2',   inline: false },
//     ],
//     footer: 'Cron · midnight EST',
//   });
//
// ⚠️  SERVER-ONLY — never import this file from a client component or page.
//     Webhook URLs are resolved lazily at call time, never at module load.
//
// v5 (Oct 2026):
//   — 7 internship event types added:
//     intern_registered, intern_closed, intern_gate, intern_submission,
//     intern_message, intern_badge, intern_digest → all route DISCORD_INTERN
//   — notifyInternship() helper added — structured embeds, timestamp always on
//   — DC palette extended: teal (messages), yellow (badges/warnings), dark (digests)
//   — getWebhook() updated with all 7 new intern event cases
//   — Usage docs updated with internship examples
//
// v4 (Sep 2026):
//   — edu_nudge → DISCORD_WEBHOOK_EDU (#edu)
//     Fires on: lesson completions, herald nudge sends, comeback emails,
//     internship CTAs — all EDU activity in one channel
//
// v3 (Sep 2026):
//   — photo_lead, photo_booking → DISCORD_WEBHOOK_MANDA_PHOTO (#manda-photography)
//   — photo_error               → DISCORD_WEBHOOK_MANDA_HOOKS (#web-dev)
//
// v2 (Sep 2026):
//   — new_signup event explicit routing → DISCORD_WEBHOOK_ADS
//   — click_milestone moved → DISCORD_WEBHOOK_SHARES (engagement, not ops)
//   — flag_toggle event added → DISCORD_WEBHOOK_ADS (ops visibility)
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
  | 'intern_gate'        // Gate completed — role may have changed
  | 'intern_submission'  // Work submitted to wall/showcase
  | 'intern_message'     // Direct message sent to owner
  | 'intern_badge'       // Badge awarded to challenger
  | 'intern_digest'      // Daily cohort snapshot — cron midnight EST
  | 'internship'         // Legacy plain-text internship events
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
  // ── Photography ───────────────────────────────────────────
  | 'photo_lead'         // Amanda partial lead           → DISCORD_WEBHOOK_MANDA_PHOTO
  | 'photo_booking'      // Amanda full booking           → DISCORD_WEBHOOK_MANDA_PHOTO
  | 'photo_error'        // Amanda system error           → DISCORD_WEBHOOK_MANDA_HOOKS
  // ── EDU ───────────────────────────────────────────────────
  | 'edu_nudge'          // EDU herald + completions      → DISCORD_WEBHOOK_EDU
  // ── Catch-all ─────────────────────────────────────────────
  | 'general';           // Catch-all                     → DISCORD_WEBHOOK_ADS

// ─── Embed types ──────────────────────────────────────────────────────────────

export type DiscordField = {
  name:    string;
  value:   string;
  inline?: boolean;
};

export type DiscordEmbed = {
  title:        string;
  description?: string;
  color:        number;
  fields?:      DiscordField[];
  footer?:      string;
  timestamp?:   boolean;
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

export const DC = {
  green:  0x2E7D32,  // approvals, gate completions, success
  gold:   0xD4AF37,  // champions, highlights
  blue:   0x0070F3,  // info, clicks, submissions
  orange: 0xF0883E,  // ANTCPU brand, archive
  red:    0xEF4444,  // rejections, errors
  purple: 0x7928CA,  // rising tier, special
  grey:   0x555555,  // neutral, system, closed cohort
  intern: 0x2563EB,  // internship challenge accent — new registrations
  edu:    0x22C55E,  // EDU — green matches MAC + lesson complete UI
  teal:   0x0D9488,  // direct messages, comms
  yellow: 0xEAB308,  // badges, achievements, warnings
  dark:   0x1E293B,  // daily digest, cron events, system snapshots
};

// ─── Webhook resolver ─────────────────────────────────────────────────────────
// 🔒 LAZY — URLs are read from env at CALL TIME, not module load time.
//    This means:
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
    case 'internship':           // legacy plain-text fallback
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
// embed    — optional structured embed with title, fields, color, footer

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
        description: embed.description,
        color:       embed.color,
        fields:      embed.fields ?? [],
        footer:      embed.footer ? { text: embed.footer } : undefined,
        timestamp:   embed.timestamp ? new Date().toISOString() : undefined,
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
//
// Example:
//   await notifyInternship('intern_registered', {
//     title:  '🎯 New Challenger — Ritik K.',
//     color:  DC.intern,
//     fields: [...],
//     footer: 'october-2026 · Day 7',
//   });

export async function notifyInternship(
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

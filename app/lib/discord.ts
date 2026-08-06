// ─── Discord — structured embeds, event routing ───────────────────────────────
//
// Webhook routing:
//   internship                              → DISCORD_INTERN
//   new_champion                            → DISCORD_WEBHOOK_CHAMPIONS
//   share                                   → DISCORD_WEBHOOK_SHARES
//   ad_approved | ad_rejected |
//   ad_archived | aria_review |
//   aria_auto_approved | aria_flagged |
//   general                                 → DISCORD_WEBHOOK_ADS
//
// Usage:
//   await notifyDiscord(content, 'internship');
//   await notifyDiscord(content, 'ad_approved', embed);
//   await notifyDiscord(content, 'aria_auto_approved', embed);
// ─────────────────────────────────────────────────────────────────────────────

import type { Platform, ShareContext } from './socialShare';

// ─── Event types ──────────────────────────────────────────────────────────────
// Add new events here when a new Discord notification type is needed.
// Every event must also be added to WEBHOOK_MAP below.

export type DiscordEvent =
  | 'internship'         // Internship challenge activity → DISCORD_INTERN
  | 'new_champion'       // New country champion signup → DISCORD_WEBHOOK_CHAMPIONS
  | 'share'              // Ad share events → DISCORD_WEBHOOK_SHARES
  | 'click_milestone'    // Click count milestones → DISCORD_WEBHOOK_ADS
  | 'new_signup'         // New user signup → DISCORD_WEBHOOK_ADS
  | 'ad_approved'        // Ad approved by admin → DISCORD_WEBHOOK_ADS
  | 'ad_rejected'        // Ad rejected by admin → DISCORD_WEBHOOK_ADS
  | 'ad_archived'        // Ad archived by admin → DISCORD_WEBHOOK_ADS
  | 'aria_review'        // First ad queued for human review → DISCORD_WEBHOOK_ADS
  | 'aria_auto_approved' // Subsequent ad auto-approved by Aria → DISCORD_WEBHOOK_ADS
  | 'aria_flagged'       // Subsequent ad flagged by Aria → DISCORD_WEBHOOK_ADS
  | 'general';           // Catch-all → DISCORD_WEBHOOK_ADS

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

export const DC = {
  green:  0x2E7D32,  // approvals, success
  gold:   0xD4AF37,  // champions, highlights
  blue:   0x0070F3,  // info, clicks
  orange: 0xF0883E,  // ANTCPU brand, archive
  red:    0xEF4444,  // rejections, errors
  purple: 0x7928CA,  // rising tier, special
  grey:   0x555555,  // neutral, system
  intern: 0x2563EB,  // internship challenge accent
};

// ─── Webhook routing ──────────────────────────────────────────────────────────
// Maps each event to its destination webhook env var.
// Events not listed here fall through to DEFAULT_WEBHOOK (DISCORD_WEBHOOK_ADS).

const WEBHOOK_MAP: Partial<Record<DiscordEvent, string | undefined>> = {
  internship:         process.env.DISCORD_INTERN,
  new_champion:       process.env.DISCORD_WEBHOOK_CHAMPIONS,
  share:              process.env.DISCORD_WEBHOOK_SHARES,
  ad_approved:        process.env.DISCORD_WEBHOOK_ADS,
  ad_rejected:        process.env.DISCORD_WEBHOOK_ADS,
  ad_archived:        process.env.DISCORD_WEBHOOK_ADS,
  aria_review:        process.env.DISCORD_WEBHOOK_ADS,
  aria_auto_approved: process.env.DISCORD_WEBHOOK_ADS,
  aria_flagged:       process.env.DISCORD_WEBHOOK_ADS,
};

const DEFAULT_WEBHOOK = process.env.DISCORD_WEBHOOK_ADS!;

// ─── Core sender ──────────────────────────────────────────────────────────────
// Sends a message (and optional embed) to the correct Discord webhook.
// content  — plain text message (can be empty string '')
// event    — routes to the correct webhook channel
// embed    — optional structured embed with title, fields, color, footer

export async function notifyDiscord(
  content:  string,
  event?:   DiscordEvent,
  embed?:   DiscordEmbed,
): Promise<void> {
  try {
    const webhook = (event && WEBHOOK_MAP[event]) || DEFAULT_WEBHOOK;
    if (!webhook) return;

    const body: Record<string, unknown> = { content };

    if (embed) {
      body.embeds = [{
        title:       embed.title,
        description: embed.description,
        color:       embed.color,
        fields:      embed.fields || [],
        footer:      embed.footer ? { text: embed.footer } : undefined,
        timestamp:   embed.timestamp ? new Date().toISOString() : undefined,
      }];
    }

    await fetch(webhook, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
  } catch {}
}

// ─── Discord platform — for social share system ───────────────────────────────
// Implements the Platform interface from socialShare.ts.
// Used by share buttons across the Arena, champion posts, and activity feeds.

import { EMOJI }              from './content/emojis';
import { championPrefixBold } from './content/templates';

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

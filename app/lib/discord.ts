// ─── Discord — structured embeds, event routing ───────────────────────────────
//
// Webhook routing:
//   internship → DISCORD_INTERN
//   new_champion → DISCORD_WEBHOOK_CHAMPIONS
//   share → DISCORD_WEBHOOK_SHARES
//   ad_approved | ad_rejected | general → DISCORD_WEBHOOK_ADS
//
// Usage:
//   await notifyDiscord(content, 'internship');
//   await notifyDiscord(content, 'ad_approved', embed);
// ─────────────────────────────────────────────────────────────────────────────

import type { Platform, ShareContext } from './socialShare';

// ─── Event types ──────────────────────────────────────────────────────────────

export type DiscordEvent =
  | 'internship'
  | 'new_champion'
  | 'share'
  | 'click_milestone'
  | 'new_signup'
  | 'ad_approved'
  | 'ad_rejected'
  | 'general';

// ─── Embed types ──────────────────────────────────────────────────────────────

export type DiscordField = {
  name:    string;
  value:   string;
  inline?: boolean;
};

export type DiscordEmbed = {
  title:      string;
  description?: string;
  color:      number;
  fields?:    DiscordField[];
  footer?:    string;
  timestamp?: boolean;
};

// ─── Color palette ────────────────────────────────────────────────────────────

export const DC = {
  green:  0x2E7D32,
  gold:   0xD4AF37,
  blue:   0x0070F3,
  orange: 0xF0883E,
  red:    0xEF4444,
  purple: 0x7928CA,
  grey:   0x555555,
  intern: 0x2563EB,  // antcpu accent — used for internship embeds
};

// ─── Webhook routing ──────────────────────────────────────────────────────────

const WEBHOOK_MAP: Partial<Record<DiscordEvent, string | undefined>> = {
  internship:   process.env.DISCORD_INTERN,
  new_champion: process.env.DISCORD_WEBHOOK_CHAMPIONS,
  share:        process.env.DISCORD_WEBHOOK_SHARES,
  ad_approved:  process.env.DISCORD_WEBHOOK_ADS,
  ad_rejected:  process.env.DISCORD_WEBHOOK_ADS,
};

const DEFAULT_WEBHOOK = process.env.DISCORD_WEBHOOK_ADS!;

// ─── Core sender ──────────────────────────────────────────────────────────────

export async function notifyDiscord(
  content:  string,
  event?:   DiscordEvent,
  embed?:   DiscordEmbed
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
// Implements Platform interface from socialShare.ts
// Used by share buttons, champion posts, arena activity

import { EMOJI }                from './content/emojis';
import { championPrefixBold }   from './content/templates';

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

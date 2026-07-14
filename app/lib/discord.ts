// ─── Discord — structured embeds, event routing ───────────────────────────────

export type DiscordEvent =
  | 'new_champion'
  | 'share'
  | 'click_milestone'
  | 'new_signup'
  | 'ad_approved'
  | 'ad_rejected'
  | 'general';

export type DiscordField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type DiscordEmbed = {
  title: string;
  description?: string;
  color: number;
  fields?: DiscordField[];
  footer?: string;
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
};

// ─── Webhook routing ──────────────────────────────────────────────────────────
const WEBHOOK_MAP: Partial<Record<DiscordEvent, string | undefined>> = {
  new_champion: process.env.DISCORD_WEBHOOK_CHAMPIONS,
  share:        process.env.DISCORD_WEBHOOK_SHARES,
  ad_approved:  process.env.DISCORD_WEBHOOK_ADS,
  ad_rejected:  process.env.DISCORD_WEBHOOK_ADS,
};

const DEFAULT_WEBHOOK = process.env.DISCORD_WEBHOOK_ADS!;

// ─── Core sender ──────────────────────────────────────────────────────────────
export async function notifyDiscord(
  content: string,
  event?: DiscordEvent,
  embed?: DiscordEmbed
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {}
}

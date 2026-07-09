// ============================================================
// antbots/index.ts — Antbot Pod Registry
// 10 antbots, each owns a channel + task
// buildClient() makes every pod instance brand + locale aware
// Monitored by ADS agent · Output only, no preamble
// ============================================================

export type AntbotStatus = 'idle' | 'running' | 'complete' | 'error';

export interface Antbot {
  id: number;
  name: string;
  channel: string;
  task: string;
  icon: string;
  status: AntbotStatus;
  output: string | null;
  tokens: number;
}

// ── Client context builder ───────────────────────────────────
// Called per-champion when their ad launches
// Replaces the hardcoded CLIENT constant
export type ClientContext = {
  brand:       string;   // e.g. 'Map of Pi'
  shopName?:   string;   // e.g. 'Mama Ama's Kitchen'
  shopType?:   string;   // e.g. 'Coffee & Café'
  shopEmoji?:  string;   // e.g. '☕'
  country?:    string;   // e.g. 'Nigeria'
  countryFlag?:string;   // e.g. '🇳🇬'
  language?:   string;   // BCP-47 e.g. 'en', 'hi', 'pt'
  youtubeAnthemId?: string; // e.g. 'PNoY1ffzciI'
};

export function buildClient(ctx: ClientContext): string {
  const {
    brand       = 'Map of Pi',
    shopName    = '',
    shopType    = '',
    shopEmoji   = '',
    country     = '',
    countryFlag = '',
    language    = 'en',
    youtubeAnthemId = 'PNoY1ffzciI',
  } = ctx;

  const shopLine = shopName
    ? `Seller shop: ${shopEmoji} ${shopName} (${shopType}) — representing ${countryFlag} ${country}.`
    : '';

  const langLine = language !== 'en'
    ? `IMPORTANT: Write all output in ${language} language. Localise tone for ${country} audience.`
    : '';

  const anthemLine = youtubeAnthemId
    ? `Map of Pi Anthem (YouTube): https://youtube.com/shorts/${youtubeAnthemId} — reference or embed where relevant.`
    : '';

  return [
    `Client: ${brand} (mapofpi.com) — 2.1M+ users, 148K sellers, Pi commerce platform, v1.8 live.`,
    `Won 2024 Pi Commerce Hackathon. Free to use, KYC verified, no bank account needed.`,
    `v2 (online shopping) coming soon. Casual tone, community voice, no hype.`,
    shopLine,
    anthemLine,
    langLine,
  ].filter(Boolean).join(' ');
}

// ── Default context (Map of Pi global, English) ──────────────
// Used by the dashboard antbot runner when no champion context is set
const DEFAULT_CLIENT = buildClient({
  brand:          'Map of Pi',
  language:       'en',
  youtubeAnthemId: 'PNoY1ffzciI',
});

const PREFIX = `You are the ANTCPU ADS Agent. Output only ready-to-post copy. No preamble, no review, no commentary. Just the content.\n\n${DEFAULT_CLIENT}\n\n`;

// ── Pod factory ──────────────────────────────────────────────
// buildPod() creates a fresh 10-bot pod for a specific champion
// Falls back to ANTBOT_POD (default) when called with no context
export function buildPod(ctx?: ClientContext): Antbot[] {
  const client = ctx ? buildClient(ctx) : DEFAULT_CLIENT;
  const pre    = `You are the ANTCPU ADS Agent. Output only ready-to-post copy. No preamble, no review, no commentary. Just the content.\n\n${client}\n\n`;

  const shopLabel = ctx?.shopName
    ? `${ctx.shopEmoji || ''} ${ctx.shopName} (${ctx.shopType || 'shop'}) in ${ctx.countryFlag || ''} ${ctx.country || ''}`
    : 'Map of Pi';

  const lang    = ctx?.language || 'en';
  const country = ctx?.country  || '';
  const anthem  = ctx?.youtubeAnthemId || 'PNoY1ffzciI';

  return [
    {
      id: 1, name: 'ANT-01', icon: '📡', channel: 'Brand Awareness', status: 'idle', output: null, tokens: 0,
      task: pre + `Write 3 brand positioning statements for ${shopLabel}. Each under 2 sentences. Target: new Pi Network users in ${country || 'the local area'} discovering the shop for the first time.`,
    },
    {
      id: 2, name: 'ANT-02', icon: '🔍', channel: 'Google Ads', status: 'idle', output: null, tokens: 0,
      task: pre + `Write 3 Google Search ad sets for ${shopLabel}. Each set: Headline (max 30 chars) + Description (max 90 chars). Target: people searching for this type of shop + Pi Network.`,
    },
    {
      id: 3, name: 'ANT-03', icon: '📸', channel: 'Meta / Instagram', status: 'idle', output: null, tokens: 0,
      task: pre + `Write 2 Instagram posts for ${shopLabel}. Each: caption (max 150 chars) + CTA + 5 hashtags. Focus on the shop's unique offering and Pi payment trust.`,
    },
    {
      id: 4, name: 'ANT-04', icon: '🐦', channel: 'Twitter / X', status: 'idle', output: null, tokens: 0,
      task: pre + `Write 5 tweets for ${shopLabel}. Mix: 2 stats-based, 2 utility-focused, 1 community pride for ${country}. Each under 280 chars. Include #mapofpi and relevant local hashtags.`,
    },
    {
      id: 5, name: 'ANT-05', icon: '👾', channel: 'Reddit', status: 'idle', output: null, tokens: 0,
      task: pre + `Write a Reddit post for r/PiNetwork. Title + body (max 200 words). Introduce ${shopLabel} to the Pi community. Conversational, no marketing speak. End with a question.`,
    },
    {
      id: 6, name: 'ANT-06', icon: '🎬', channel: 'YouTube', status: 'idle', output: null, tokens: 0,
      task: pre + `Write a 60-second YouTube Shorts script for ${shopLabel}. Show a customer finding the shop on Map of Pi, paying with Pi, leaving a review. Upbeat but real. Include on-screen text cues. Reference the Map of Pi Anthem at https://youtube.com/shorts/${anthem} as inspiration for tone.`,
    },
    {
      id: 7, name: 'ANT-07', icon: '🎵', channel: 'TikTok', status: 'idle', output: null, tokens: 0,
      task: pre + `Write a TikTok concept for ${shopLabel} targeting crypto-curious Gen Z in ${country || 'the local market'}. Hook (first 3 seconds) + 3 scene breakdown + CTA. Angle: you can spend Pi at a real local shop right now.`,
    },
    {
      id: 8, name: 'ANT-08', icon: '📝', channel: 'SEO / Content', status: 'idle', output: null, tokens: 0,
      task: pre + `Write a 200-word SEO blog intro for: "Find ${ctx?.shopType || 'shops'} that accept Pi in ${country || 'your area'} — Map of Pi". Include keywords: Pi Network marketplace, buy with Pi, Pi commerce, Map of Pi sellers.`,
    },
    {
      id: 9, name: 'ANT-09', icon: '💬', channel: 'Discord / Community', status: 'idle', output: null, tokens: 0,
      task: pre + `Write a Discord announcement for the Pi Network ${country || 'global'} community server. Max 150 words. Introduce ${shopLabel} as a new Map of Pi seller. End with a question to drive replies.`,
    },
    {
      id: 10, name: 'ANT-10', icon: '📧', channel: 'Email Campaign', status: 'idle', output: null, tokens: 0,
      task: pre + `Write a welcome email for a new Map of Pi seller: ${shopLabel}. Subject line + 3 short paragraphs. Para 1: welcome + what Map of Pi is. Para 2: how their shop is now live on the network. Para 3: what the antbots are doing for them right now + CTA to share.`,
    },
  ];
}

// ── Default pod (backward compatible) ───────────────────────
// All existing dashboard/arena code that imports ANTBOT_POD still works
export const ANTBOT_POD: Antbot[] = buildPod();

export default ANTBOT_POD;

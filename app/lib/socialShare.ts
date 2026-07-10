export type AdType = 'Brand Awareness' | 'Product Launch' | 'Pi Commerce' | 'Content Promotion' | 'Service Offering' | 'Event' | 'Other';

export interface ShareContext {
  brand: string;
  title: string;
  description: string;
  url: string;           // destination URL
  profileUrl: string;    // /profile/[email]
  category: AdType | string;
  country?: string;
  isChampion?: boolean;
  promoCode?: string;
}

export interface Platform {
  key: string;
  label: string;
  icon: string;
  color: string;
  supportsIntent: boolean;
  profileUrl: (handle: string) => string;
  intentUrl: (text: string, url: string) => string;
  buildPost: (ctx: ShareContext) => string;
}

const HASHTAGS: Record<string, string> = {
  'Pi Commerce':        '#mapofpi #pinetwork #picommerce #crypto',
  'Brand Awareness':    '#branding #marketing #growthhacking #antcpuads',
  'Product Launch':     '#productlaunch #startup #newproduct #antcpuads',
  'Content Promotion':  '#content #creator #marketing #antcpuads',
  'Service Offering':   '#services #business #antcpuads',
  'Event':              '#event #community #antcpuads',
  'Other':              '#marketing #ads #antcpuads',
};

function championPrefix(ctx: ShareContext) {
  return ctx.isChampion && ctx.country
    ? `🏆 ${ctx.country} Arena Champion\n`
    : '';
}

export const PLATFORMS: Platform[] = [
  {
    key: 'twitter', label: 'X / Twitter', icon: '𝕏', color: '#000000',
    supportsIntent: true,
    profileUrl: h => `https://twitter.com/${h.replace('@','')}`,
    intentUrl: (text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    buildPost: ctx => {
      const champ = ctx.isChampion ? `🏆 ${ctx.country} Champion ` : '';
      return `${champ}${ctx.brand} is live on @antcpu_ads ⚡\n\n"${ctx.title}"\n\n${ctx.description.slice(0, 80)}...\n\n${HASHTAGS[ctx.category] || HASHTAGS.Other}`;
    },
  },
  {
    key: 'facebook', label: 'Facebook', icon: '📘', color: '#1877F2',
    supportsIntent: true,
    profileUrl: h => `https://facebook.com/${h}`,
    intentUrl: (_text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    buildPost: ctx =>
      `${championPrefix(ctx)}${ctx.brand} — ${ctx.title}\n\n${ctx.description}\n\n→ ${ctx.url}`,
  },
  {
    key: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0A66C2',
    supportsIntent: true,
    profileUrl: h => `https://linkedin.com/in/${h}`,
    intentUrl: (_text, url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    buildPost: ctx =>
      `${championPrefix(ctx)}Excited to share ${ctx.brand} on ANTCPU ADS.\n\n${ctx.description}\n\nCategory: ${ctx.category}\n→ ${ctx.profileUrl}\n\n#advertising #brand #antcpuads`,
  },
  {
    key: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366',
    supportsIntent: true,
    profileUrl: h => `https://wa.me/${h}`,
    intentUrl: (text, _url) => `https://wa.me/?text=${encodeURIComponent(text)}`,
    buildPost: ctx => {
      const champ = ctx.isChampion ? `🏆 *${ctx.country} Champion*\n` : '';
      return `${champ}⚡ *${ctx.brand}* is in the Arena!\n\n"${ctx.title}"\n${ctx.description.slice(0, 100)}\n\n→ ${ctx.url}\n\nJoin: antcpu-ads.vercel.app`;
    },
  },
  {
    key: 'telegram', label: 'Telegram', icon: '✈️', color: '#26A5E4',
    supportsIntent: true,
    profileUrl: h => `https://t.me/${h.replace('@','')}`,
    intentUrl: (text, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    buildPost: ctx => {
      const champ = ctx.isChampion ? `🏆 **${ctx.country} Champion**\n` : '';
      return `${champ}**${ctx.brand}** — ${ctx.title}\n\n${ctx.description}\n\n→ ${ctx.url}\n\n${HASHTAGS[ctx.category] || HASHTAGS.Other}`;
    },
  },
  {
    key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C',
    supportsIntent: false,
    profileUrl: h => `https://instagram.com/${h.replace('@','')}`,
    intentUrl: () => '',
    buildPost: ctx => {
      const champ = ctx.isChampion ? `🏆 ${ctx.country} Arena Champion\n\n` : '';
      return `${champ}${ctx.brand} ⚡\n\n${ctx.title}\n\n${ctx.description}\n\n🔗 Link in bio → ${ctx.url}\n\n${HASHTAGS[ctx.category] || HASHTAGS.Other} #arena #antcpu`;
    },
  },
  {
    key: 'tiktok', label: 'TikTok', icon: '🎵', color: '#ff0050',
    supportsIntent: false,
    profileUrl: h => `https://tiktok.com/@${h.replace('@','')}`,
    intentUrl: () => '',
    buildPost: ctx =>
      `Have you seen ${ctx.brand}? ⚡\n\n${ctx.title} 👀\n\n${ctx.description.slice(0, 80)}\n\nLink in bio!\n\n${HASHTAGS[ctx.category] || HASHTAGS.Other} #fyp #viral`,
  },
  {
    key: 'youtube', label: 'YouTube', icon: '▶️', color: '#FF0000',
    supportsIntent: false,
    profileUrl: h => `https://youtube.com/@${h.replace('@','')}`,
    intentUrl: () => '',
    buildPost: ctx =>
      `${ctx.brand} — ${ctx.title}\n\n${ctx.description}\n\nWebsite: ${ctx.url}\nArena Profile: ${ctx.profileUrl}\n\n${HASHTAGS[ctx.category] || HASHTAGS.Other}`,
  },
  {
    key: 'discord', label: 'Discord', icon: '💬', color: '#5865F2',
    supportsIntent: false,
    profileUrl: h => `https://discord.gg/${h}`,
    intentUrl: () => '',
    buildPost: ctx => {
      const champ = ctx.isChampion ? `🏆 **${ctx.country} Champion** · ` : '';
      return `${champ}**${ctx.brand}** is live in the Arena ⚡\n> ${ctx.title}\n> ${ctx.description.slice(0, 120)}\n→ ${ctx.url}`;
    },
  },
];

export function getShareAction(platform: Platform, ctx: ShareContext): { url: string | null; text: string } {
  const post = platform.buildPost(ctx);
  const shareUrl = platform.supportsIntent
    ? platform.intentUrl(post, ctx.profileUrl)
    : null;
  return { url: shareUrl, text: post };
}

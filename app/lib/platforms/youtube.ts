import { Platform } from '../socialShare';
import { getHashtags } from '../content/hashtags';

// ─── YouTube Channel Registry ─────────────────────────────────────────────────
// Maps arena slug → YouTube channel ID + handle
// Only add brands that have confirmed YouTube channels
// Channel ID format: UCxxxxxxxxxxxxxxxxxxxxxxxxx (24 chars)

export const YOUTUBE_CHANNELS: Record<string, { channelId: string; handle: string }> = {
  mapofpi: {
    channelId: 'UCxxxxxxxxxxxxxxxxxxxxxxxxx', // TODO: replace with real Map of Pi channel ID
    handle:    '@mapofpi',
  },
  antcpu: {
    channelId: 'UCxxxxxxxxxxxxxxxxxxxxxxxxx', // TODO: replace with real ANTCPU channel ID
    handle:    '@antcpu',
  },
};

export const youtube: Platform = {
  key:            'youtube',
  label:          'YouTube',
  icon:           '▶️',
  color:          '#FF0000',
  supportsIntent: false,
  profileUrl:     h => `https://youtube.com/@${h.replace('@', '')}`,
  intentUrl:      () => '',
  buildPost: ctx =>
    `${ctx.brand} — ${ctx.title}\n\n${ctx.description}\n\nWebsite: ${ctx.url}\nArena Profile: ${ctx.profileUrl}\n\n${getHashtags(ctx.category)}`,
};

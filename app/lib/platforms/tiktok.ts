import { Platform } from '../socialShare';
import { getHashtags } from '../content/hashtags';

export const tiktok: Platform = {
  key:            'tiktok',
  label:          'TikTok',
  icon:           '🎵',
  color:          '#ff0050',
  supportsIntent: false,
  profileUrl:     h => `https://tiktok.com/@${h.replace('@', '')}`,
  intentUrl:      () => '',
  buildPost: ctx =>
    `Have you seen ${ctx.brand}? ⚡\n\n${ctx.title} 👀\n\n${ctx.description.slice(0, 80)}\n\nLink in bio!\n\n${getHashtags(ctx.category)} #fyp #viral`,
};

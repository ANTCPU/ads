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
  buildPost: ctx => {
    const desc = ctx.description.length > 80
      ? ctx.description.slice(0, ctx.description.lastIndexOf(' ', 80)) + '…'
      : ctx.description;
    return `Have you seen ${ctx.brand}? ⚡\n\n${ctx.title} 👀\n\n${desc}\n\n→ ${ctx.url}\n\nLink in bio!\n\n${getHashtags(ctx.category)} #fyp #viral`;
  },
};

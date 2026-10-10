import { Platform } from '../socialShare';
import { getHashtags } from '../content/hashtags';
import { EMOJI } from '../content/emojis';

export const bluesky: Platform = {
  key:            'bluesky',
  label:          'Bluesky',
  icon:           '🦋',
  color:          '#0085FF',
  supportsIntent: true,
  profileUrl:     h => `https://bsky.app/profile/${h.replace('@', '')}`,
  intentUrl:      (text, url) => `https://bsky.app/intent/compose?text=${encodeURIComponent(text + '\n' + url)}`,
  buildPost: ctx => {
    const champ = ctx.isChampion ? `${EMOJI.champion} ${ctx.country} Champion ` : '';
    const desc  = ctx.description.length > 80
      ? ctx.description.slice(0, ctx.description.lastIndexOf(' ', 80)) + '…'
      : ctx.description;
    return `${champ}${ctx.brand} is live on @antcpu.bsky.social ${EMOJI.live}\n\n"${ctx.title}"\n\n${desc}\n\n${getHashtags(ctx.category)}`;
  },
};

import { Platform } from '../socialShare';
import { getHashtags } from '../content/hashtags';
import { EMOJI } from '../content/emojis';

export const tumblr: Platform = {
  key:            'tumblr',
  label:          'Tumblr',
  icon:           '🔵',
  color:          '#35465C',
  supportsIntent: true,
  profileUrl:     h => `https://${h.replace('@', '')}.tumblr.com`,
  intentUrl:      (text, url) => `https://www.tumblr.com/share/link?url=${encodeURIComponent(url)}&name=${encodeURIComponent(text.slice(0, 80))}&description=${encodeURIComponent(text)}`,
  buildPost: ctx => {
    const champ = ctx.isChampion ? `${EMOJI.champion} ${ctx.country} Champion — ` : '';
    const desc  = ctx.description.length > 120
      ? ctx.description.slice(0, ctx.description.lastIndexOf(' ', 120)) + '…'
      : ctx.description;
    return `${champ}${ctx.brand} ${EMOJI.live}\n\n"${ctx.title}"\n\n${desc}\n\n${getHashtags(ctx.category)}`;
  },
};

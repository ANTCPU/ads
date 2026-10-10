import { Platform } from '../socialShare';
import { getHashtags } from '../content/hashtags';
import { EMOJI } from '../content/emojis';

export const pinterest: Platform = {
  key:            'pinterest',
  label:          'Pinterest',
  icon:           '📌',
  color:          '#E60023',
  supportsIntent: true,
  profileUrl:     h => `https://pinterest.com/${h.replace('@', '')}`,
  intentUrl:      (text, url) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
  buildPost: ctx => {
    const champ = ctx.isChampion ? `${EMOJI.champion} ${ctx.country} Champion — ` : '';
    const desc  = ctx.description.length > 100
      ? ctx.description.slice(0, ctx.description.lastIndexOf(' ', 100)) + '…'
      : ctx.description;
    return `${champ}${ctx.brand} ${EMOJI.live}\n\n"${ctx.title}"\n\n${desc}\n\n${getHashtags(ctx.category)}`;
  },
};

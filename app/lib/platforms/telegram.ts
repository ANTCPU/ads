import { Platform } from '../socialShare';
import { getHashtags } from '../content/hashtags';
import { EMOJI } from '../content/emojis';

export const telegram: Platform = {
  key:            'telegram',
  label:          'Telegram',
  icon:           '✈️',
  color:          '#26A5E4',
  supportsIntent: true,
  profileUrl:     h => `https://t.me/${h.replace('@', '')}`,
  intentUrl:      (text, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  buildPost: ctx => {
    const champ = ctx.isChampion ? `${EMOJI.champion} **${ctx.country} Champion**\n` : '';
    return `${champ}**${ctx.brand}** — ${ctx.title}\n\n${ctx.description}\n\n→ ${ctx.url}\n\n${getHashtags(ctx.category)}`;
  },
};

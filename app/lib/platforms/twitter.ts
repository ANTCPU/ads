import { Platform } from '../socialShare';
import { getHashtags } from '../content/hashtags';
import { EMOJI } from '../content/emojis';

export const twitter: Platform = {
  key:            'twitter',
  label:          'X / Twitter',
  icon:           '𝕏',
  color:          '#000000',
  supportsIntent: true,
  profileUrl:     h => `https://twitter.com/${h.replace('@', '')}`,
  intentUrl:      (text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  buildPost: ctx => {
    const champ = ctx.isChampion ? `${EMOJI.champion} ${ctx.country} Champion ` : '';
    return `${champ}${ctx.brand} is live on @antcpu_ads ${EMOJI.live}\n\n"${ctx.title}"\n\n${ctx.description.slice(0, 80)}...\n\n${getHashtags(ctx.category)}`;
  },
};

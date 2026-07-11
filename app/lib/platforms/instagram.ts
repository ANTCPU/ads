import { Platform } from '../socialShare';
import { getHashtags } from '../content/hashtags';
import { EMOJI } from '../content/emojis';
import { championPrefix } from '../content/templates';

export const instagram: Platform = {
  key:            'instagram',
  label:          'Instagram',
  icon:           '📸',
  color:          '#E1306C',
  supportsIntent: false,
  profileUrl:     h => `https://instagram.com/${h.replace('@', '')}`,
  intentUrl:      () => '',
  buildPost: ctx =>
    `${championPrefix(ctx)}${ctx.brand} ${EMOJI.live}\n\n${ctx.title}\n\n${ctx.description}\n\n🔗 Link in bio → ${ctx.url}\n\n${getHashtags(ctx.category)} #arena #antcpu`,
};

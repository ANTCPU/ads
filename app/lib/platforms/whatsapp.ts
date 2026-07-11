import { Platform } from '../socialShare';
import { EMOJI } from '../content/emojis';

export const whatsapp: Platform = {
  key:            'whatsapp',
  label:          'WhatsApp',
  icon:           '💬',
  color:          '#25D366',
  supportsIntent: true,
  profileUrl:     h => `https://wa.me/${h}`,
  intentUrl:      (text, _url) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  buildPost: ctx => {
    const champ = ctx.isChampion ? `${EMOJI.champion} *${ctx.country} Champion*\n` : '';
    return `${champ}${EMOJI.live} *${ctx.brand}* is in the Arena!\n\n"${ctx.title}"\n${ctx.description.slice(0, 100)}\n\n→ ${ctx.url}\n\nJoin: antcpu-ads.vercel.app`;
  },
};

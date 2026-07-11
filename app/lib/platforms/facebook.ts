import { Platform } from '../socialShare';
import { championPrefix } from '../content/templates';

export const facebook: Platform = {
  key:            'facebook',
  label:          'Facebook',
  icon:           '📘',
  color:          '#1877F2',
  supportsIntent: true,
  profileUrl:     h => `https://facebook.com/${h}`,
  intentUrl:      (_text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  buildPost: ctx =>
    `${championPrefix(ctx)}${ctx.brand} — ${ctx.title}\n\n${ctx.description}\n\n→ ${ctx.url}`,
};

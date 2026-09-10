import { Platform } from '../socialShare';
import { championPrefix } from '../content/templates';

export const linkedin: Platform = {
  key:            'linkedin',
  label:          'LinkedIn',
  icon:           '💼',
  color:          '#0A66C2',
  supportsIntent: true,
  profileUrl:     h => `https://linkedin.com/in/${h}`,
  intentUrl:      (_text, url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  buildPost: ctx =>
    `${championPrefix(ctx)}${ctx.brand} — ${ctx.title}\n\n${ctx.description}\n\nCategory: ${ctx.category}\n→ ${ctx.url}\n\n#advertising #brand #antcpuads`,
};

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
    `${championPrefix(ctx)}Excited to share ${ctx.brand} on ANTCPU ADS.\n\n${ctx.description}\n\nCategory: ${ctx.category}\n→ ${ctx.profileUrl}\n\n#advertising #brand #antcpuads`,
};

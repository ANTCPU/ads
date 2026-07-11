import { Platform } from '../socialShare';
import { EMOJI } from '../content/emojis';
import { championPrefixBold } from '../content/templates';

export const discordPlatform: Platform = {
  key:            'discord',
  label:          'Discord',
  icon:           '💬',
  color:          '#5865F2',
  supportsIntent: false,
  profileUrl:     h => `https://discord.gg/${h}`,
  intentUrl:      () => '',
  buildPost: ctx =>
    `${championPrefixBold(ctx)}**${ctx.brand}** is live in the Arena ${EMOJI.live}\n> ${ctx.title}\n> ${ctx.description.slice(0, 120)}\n→ ${ctx.url}`,
};

// ─── Post Templates ───────────────────────────────────────────────────────────
// Reusable building blocks for social post generation.
// All platform buildPost functions should compose from these.

import { EMOJI } from './emojis';
import { getHashtags } from './hashtags';

// ShareContext is imported from the bones file
export type TemplateContext = {
  brand: string;
  title: string;
  description: string;
  url: string;
  profileUrl: string;
  category: string;
  country?: string;
  isChampion?: boolean;
  promoCode?: string;
};

// ─── Prefixes ─────────────────────────────────────────────────────────────────

export function championPrefix(ctx: TemplateContext): string {
  return ctx.isChampion && ctx.country
    ? `${EMOJI.champion} ${ctx.country} Arena Champion\n`
    : '';
}

export function championPrefixBold(ctx: TemplateContext): string {
  return ctx.isChampion && ctx.country
    ? `${EMOJI.champion} **${ctx.country} Champion** · `
    : '';
}

export function championPrefixMarkdown(ctx: TemplateContext): string {
  return ctx.isChampion && ctx.country
    ? `${EMOJI.champion} *${ctx.country} Champion*\n`
    : '';
}

// ─── Footers ──────────────────────────────────────────────────────────────────

export function arenaFooter(ctx: TemplateContext): string {
  return `→ ${ctx.profileUrl}\n\nantcpu-ads.vercel.app`;
}

export function arenaFooterShort(): string {
  return `antcpu-ads.vercel.app`;
}

export function promoFooter(ctx: TemplateContext): string {
  return ctx.promoCode
    ? `Use code: ${ctx.promoCode}\n→ ${ctx.url}`
    : `→ ${ctx.url}`;
}

// ─── Body builders ────────────────────────────────────────────────────────────

export function shortBody(ctx: TemplateContext, maxLen = 80): string {
  return ctx.description.length > maxLen
    ? ctx.description.slice(0, maxLen) + '...'
    : ctx.description;
}

export function fullBody(ctx: TemplateContext): string {
  return ctx.description;
}

export function standardPost(ctx: TemplateContext): string {
  return [
    championPrefix(ctx),
    `${EMOJI.live} ${ctx.brand} is live on the Ad Network`,
    `\n"${ctx.title}"`,
    `\n${shortBody(ctx)}`,
    `\n\n${getHashtags(ctx.category)}`,
    `\n${arenaFooter(ctx)}`,
  ].join('');
}

export function compactPost(ctx: TemplateContext): string {
  return [
    `${ctx.brand} — ${ctx.title}`,
    `\n${shortBody(ctx, 100)}`,
    `\n→ ${ctx.url}`,
  ].join('');
}

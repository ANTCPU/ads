//
//  index.ts
//  
//
//  Created by Joseph Antony Ciccone on 5/16/26.
//
import { ar } from './ar';
import { zh } from './zh';
import { es } from './es';
import { hi } from './hi';
import { pt } from './pt';
import { fr } from './fr';
import { it } from './it';

export type Locale = 'en' | 'ar' | 'zh' | 'es' | 'hi' | 'pt' | 'fr' | 'it';

export const locales: Locale[] = ['en', 'ar', 'zh', 'es', 'hi', 'pt', 'fr', 'it'];

export const localeLabels: Record<Locale, string> = {
  en: 'EN',
  ar: 'AR',
  zh: 'ZH',
  es: 'ES',
  hi: 'HI',
  pt: 'PT',
  fr: 'FR',
  it: 'IT',
};

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  zh: '中文',
  es: 'Espanol',
  hi: 'हिन्दी',
  pt: 'Portugues',
  fr: 'Francais',
  it: 'Italiano',
};

export const translations: Record<Locale, Record<string, string>> = {
  en: {},
  ar,
  zh,
  es,
  hi,
  pt,
  fr,
  it,
};

export function t(locale: Locale, key: string): string {
  if (locale === 'en') return key;
  return translations[locale]?.[key] ?? key;
}

export function isRTL(locale: Locale): boolean {
  return translations[locale]?.rtl === 'true';
}

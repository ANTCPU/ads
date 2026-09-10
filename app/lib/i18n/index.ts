import { en } from './en';
import { ar } from './ar';
import { zh } from './zh';
import { es } from './es';
import { hi } from './hi';
import { pt } from './pt';
import { fr } from './fr';
import { it } from './it';
import { id } from './id';
import { vi } from './vi';
import { tr } from './tr';
import { ko } from './ko';

export type Locale = 'en' | 'ar' | 'zh' | 'es' | 'hi' | 'pt' | 'fr' | 'it' | 'id' | 'vi' | 'tr' | 'ko';

export const locales: Locale[] = ['en', 'ar', 'zh', 'es', 'hi', 'pt', 'fr', 'it', 'id', 'vi', 'tr', 'ko'];

export const localeLabels: Record<Locale, string> = {
  en: 'EN', ar: 'AR', zh: 'ZH', es: 'ES',
  hi: 'HI', pt: 'PT', fr: 'FR', it: 'IT',
  id: 'ID', vi: 'VI', tr: 'TR', ko: 'KO',
};

export const localeNames: Record<Locale, string> = {
  en: 'English',          ar: 'العربية',        zh: '中文',
  es: 'Español',          hi: 'हिन्दी',          pt: 'Português',
  fr: 'Français',         it: 'Italiano',        id: 'Bahasa Indonesia',
  vi: 'Tiếng Việt',       tr: 'Türkçe',          ko: '한국어',
};

export const translations: Record<Locale, Record<string, string>> = {
  en, ar, zh, es, hi, pt, fr, it, id, vi, tr, ko,
};

export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations['en']?.[key] ?? key;
}

export function isRTL(locale: Locale): boolean {
  return translations[locale]?.rtl === 'true';
}

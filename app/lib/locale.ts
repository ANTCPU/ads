// app/lib/locale.ts

import type { Locale } from './i18n/index';

// Country name → locale (ipapi.co returns full names)
const COUNTRY_LOCALE: Record<string, Locale> = {
  // Arabic
  'Saudi Arabia': 'ar', 'United Arab Emirates': 'ar', 'Egypt': 'ar',
  'Morocco': 'ar', 'Algeria': 'ar', 'Tunisia': 'ar', 'Jordan': 'ar',
  'Iraq': 'ar', 'Kuwait': 'ar', 'Lebanon': 'ar', 'Libya': 'ar',
  'Syria': 'ar', 'Yemen': 'ar', 'Sudan': 'ar',
  // Chinese
  'China': 'zh', 'Taiwan': 'zh', 'Hong Kong': 'zh',
  // Spanish
  'Spain': 'es', 'Mexico': 'es', 'Argentina': 'es', 'Colombia': 'es',
  'Chile': 'es', 'Peru': 'es', 'Venezuela': 'es', 'Ecuador': 'es',
  'Guatemala': 'es', 'Bolivia': 'es', 'Honduras': 'es',
  'Paraguay': 'es', 'Nicaragua': 'es', 'Panama': 'es', 'Uruguay': 'es',
  // Hindi
  'India': 'hi',
  // Portuguese
  'Brazil': 'pt', 'Portugal': 'pt', 'Mozambique': 'pt', 'Angola': 'pt',
  // French
  'France': 'fr', 'Belgium': 'fr', 'Switzerland': 'fr', 'Senegal': 'fr',
  'Cameroon': 'fr', 'Congo': 'fr',
  // Italian
  'Italy': 'it',
  // Indonesian
  'Indonesia': 'id',
  // Vietnamese
  'Vietnam': 'vi',
};

const STORAGE_KEY = 'arena_locale';

export function countryToLocale(country: string): Locale {
  return COUNTRY_LOCALE[country] || 'en';
}

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem(STORAGE_KEY) as Locale) || 'en';
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, locale);
}

export function detectAndStoreLocale(country: string): Locale {
  const locale = countryToLocale(country);
  // Only auto-set if user hasn't manually chosen one
  if (!localStorage.getItem(STORAGE_KEY)) {
    setStoredLocale(locale);
  }
  return locale;
}

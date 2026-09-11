//
//  app/es/page.tsx — es  (Español)
//  Locale route wrapper — renders SplashPage with locale="es"
//  Translations : app/lib/i18n/es.ts
//  Country map  : locale.ts → 18 Spanish-speaking countries → 'es'
//  RTL          : no
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: 'Plataforma de marketing automatizado. Prueba gratis 3 días.',
  openGraph: {
    locale: 'es_ES',
  },
};

export default function ESPage() {
  return <SplashPage locale="es" />;
}

//
//  app/it/page.tsx — it  (Italiano)
//  Locale route wrapper — renders SplashPage with locale="it"
//  Translations : app/lib/i18n/it.ts
//  Country map  : locale.ts → Italy → 'it'
//  RTL          : no
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: 'Piattaforma di marketing automatizzato. Prova gratuita 3 giorni.',
  openGraph: {
    locale: 'it_IT',
  },
};

export default function ITPage() {
  return <SplashPage locale="it" />;
}

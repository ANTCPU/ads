//
//  app/pt/page.tsx — pt  (Português)
//  Locale route wrapper — renders SplashPage with locale="pt"
//  Translations : app/lib/i18n/pt.ts
//  Country map  : locale.ts → 4 Portuguese-speaking countries → 'pt'
//  RTL          : no
//  OG locale    : pt_BR — Brazil is the dominant Pi Network market
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: 'Plataforma de marketing automatizado. Teste grátis por 3 dias.',
  openGraph: {
    locale: 'pt_BR',
  },
};

export default function PTPage() {
  return <SplashPage locale="pt" />;
}

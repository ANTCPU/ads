//
//  app/fr/page.tsx — fr  (Français)
//  Locale route wrapper — renders SplashPage with locale="fr"
//  Translations : app/lib/i18n/fr.ts
//  Country map  : locale.ts → 6 French-speaking countries → 'fr'
//  RTL          : no
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: 'Plateforme de marketing automatisé. Essai gratuit 3 jours.',
  openGraph: {
    locale: 'fr_FR',
  },
};

export default function FRPage() {
  return <SplashPage locale="fr" />;
}

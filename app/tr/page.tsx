//
//  app/tr/page.tsx — tr  (Türkçe)
//  Locale route wrapper — renders SplashPage with locale="tr"
//  Translations : app/lib/i18n/tr.ts
//  Country map  : locale.ts → 'Turkey' → 'tr'
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: 'Otomatik pazarlama sistemlerinin merkezi. 3 gün ücretsiz deneyin.',
  openGraph: {
    locale: 'tr_TR',
  },
};

export default function TRPage() {
  return <SplashPage locale="tr" />;
}

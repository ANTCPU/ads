//  app/id/page.tsx — id  (Bahasa Indonesia)
//  Locale route wrapper — renders SplashPage with locale="id"
//  Translations : app/lib/i18n/id.ts
//  Country map  : locale.ts → 'Indonesia' → 'id'
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: 'Pusat utama sistem pemasaran otomatis. Coba gratis 3 hari.',
  openGraph: {
    locale: 'id_ID',
  },
};

export default function IDPage() {
  return <SplashPage locale="id" />;
}

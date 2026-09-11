//
//  app/hi/page.tsx — hi  (हिन्दी)
//  Locale route wrapper — renders SplashPage with locale="hi"
//  Translations : app/lib/i18n/hi.ts
//  Country map  : locale.ts → India → 'hi'
//  RTL          : no
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: 'स्वचालित मार्केटिंग प्लेटफ़ॉर्म। 3 दिन मुफ़्त आज़माएं।',
  openGraph: {
    locale: 'hi_IN',
  },
};

export default function HIPage() {
  return <SplashPage locale="hi" />;
}

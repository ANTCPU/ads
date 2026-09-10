//
//  app/ar/page.tsx — ar  (العربية)
//  Locale route wrapper — renders SplashPage with locale="ar"
//  Translations : app/lib/i18n/ar.ts
//  Country map  : locale.ts → 14 Arabic-speaking countries → 'ar'
//  RTL          : yes — dir="rtl" applied by SplashPage via isRTL()
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: 'المركز الرئيسي لأنظمة التسويق الآلي. جرّب مجاناً لمدة 3 أيام.',
  openGraph: {
    locale: 'ar_SA',
  },
};

export default function ARPage() {
  return <SplashPage locale="ar" />;
}

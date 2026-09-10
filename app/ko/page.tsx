//
//  app/ko/page.tsx — ko  (한국어)
//  Locale route wrapper — renders SplashPage with locale="ko"
//  Translations : app/lib/i18n/ko.ts
//  Country map  : locale.ts → 'South Korea' → 'ko'
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: '자동화 마케팅 시스템의 중앙 허브. 3일 무료 체험.',
  openGraph: {
    locale: 'ko_KR',
  },
};

export default function KOPage() {
  return <SplashPage locale="ko" />;
}

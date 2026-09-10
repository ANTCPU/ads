//
//  app/vi/page.tsx — vi  (Tiếng Việt)
//  Locale route wrapper — renders SplashPage with locale="vi"
//  Translations : app/lib/i18n/vi.ts
//  Country map  : locale.ts → 'Vietnam' → 'vi'
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: 'Trung tâm chính của các hệ thống tiếp thị tự động. Dùng thử miễn phí 3 ngày.',
  openGraph: {
    locale: 'vi_VN',
  },
};

export default function VIPage() {
  return <SplashPage locale="vi" />;
}

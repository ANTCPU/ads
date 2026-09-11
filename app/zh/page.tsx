//
//  app/zh/page.tsx — zh  (中文)
//  Locale route wrapper — renders SplashPage with locale="zh"
//  Translations : app/lib/i18n/zh.ts
//  Country map  : locale.ts → 3 Chinese-speaking regions → 'zh'
//  RTL          : no
//  OG locale    : zh_CN — Simplified Chinese for mainland + diaspora reach
//
import type { Metadata } from 'next';
import SplashPage from '../page';

export const metadata: Metadata = {
  title:       'ANTCPU ADS — The Arena',
  description: '自动化营销平台。免费试用3天。',
  openGraph: {
    locale: 'zh_CN',
  },
};

export default function ZHPage() {
  return <SplashPage locale="zh" />;
}

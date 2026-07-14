import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Arena Guide — ANTCPU ADS',
  description: 'Three ways to plug into the network. Create an ad, share brands, and find other advertisers. You\'re 3 minutes from live.',
  openGraph: {
    title: 'Arena Guide — ANTCPU ADS',
    description: 'Create an ad. Share brands. Find others. You\'re 3 minutes from live.',
    url: 'https://antcpu-ads.vercel.app/guide',
    images: [{ url: 'https://antcpu-ads.vercel.app/og-image.jpg', width: 1200, height: 630 }],
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

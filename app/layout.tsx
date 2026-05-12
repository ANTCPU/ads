import React from 'react';

export const metadata = {
  title: 'ANTCPU ADS',
  description: 'The Arena — automated marketing powered by AI antbots.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>',
  },
  openGraph: {
    title: 'ANTCPU ADS — The Arena',
    description: 'The central hub for automated marketing systems. Free 3-day trial.',
    url: 'https://antcpu-ads.vercel.app',
    siteName: 'ANTCPU ADS',
    images: [
      {
        url: 'https://antcpu-ads.vercel.app/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ANTCPU ADS',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ANTCPU ADS — The Arena',
    description: 'The central hub for automated marketing systems. Free 3-day trial.',
    images: ['https://antcpu-ads.vercel.app/og-image.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

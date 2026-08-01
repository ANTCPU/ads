export const metadata = {
  title: 'Join the Challenge — antcpu.io Internship',
  description: '31 days. Real roles. Real CV. Dev or Marketing. Enter the Arena.',
  openGraph: {
    title: 'Join the Challenge — antcpu.io Internship',
    description: '31 days. Real roles. Real CV. Dev or Marketing. Enter the Arena.',
    url: 'https://antcpu-ads.vercel.app/internship/join',
    siteName: 'ANTCPU ADS',
    images: [{ url: 'https://antcpu-ads.vercel.app/og-internchallenge.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://antcpu-ads.vercel.app/og-internchallenge.jpg'],
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

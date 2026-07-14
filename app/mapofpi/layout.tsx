export const metadata = {
  title: 'Map of Pi — Country Champions | AD Network',
  description: 'Claim your country. Deploy 10 antbots. Represent your region in the Arena.',
  openGraph: {
    title: 'Map of Pi — Country Champions',
    description: 'Claim your country. Deploy 10 antbots. Represent your region in the Arena.',
    url: 'https://antcpu-ads.vercel.app/mapofpi',
    siteName: 'Map of Pi - Country Champions',
    images: [
      {
        url: 'https://antcpu-ads.vercel.app/og-mapofpi.jpg',
        width: 1200,
        height: 630,
        alt: 'Map of Pi — Country Champions',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Map of Pi — Country Champions',
    description: 'Claim your country. Deploy 10 antbots. Represent your region in the Arena.',
    images: ['https://antcpu-ads.vercel.app/og-mapofpi.jpg'],
  },
};

export default function MapOfPiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

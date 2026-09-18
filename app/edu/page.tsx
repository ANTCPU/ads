// app/edu/page.tsx
import { Metadata } from 'next'
import EduClient from './EduClient'

export const metadata: Metadata = {
  title: 'antcpu EDU — Free Classes in Tech, Art, Music & Religion',
  description: '48 lessons ready. 4 categories. All free. No signup, no credit card. Start today.',
  openGraph: {
    title: 'antcpu EDU — Free Classes in Tech, Art, Music & Religion',
    description: '48 lessons ready. 4 categories. All free. No signup, no credit card.',
    url: 'https://antcpu-ads.vercel.app/edu',
    siteName: 'ANTCPU ADS',
    images: [{ url: 'https://antcpu.com/edu/antcpuedu.jpg', width: 1200, height: 630, alt: 'antcpu EDU' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'antcpu EDU — Free Classes in Tech, Art, Music & Religion',
    description: '48 lessons ready. 4 categories. All free. No signup, no credit card.',
    images: ['https://antcpu.com/edu/antcpuedu.jpg'],
  },
}

export default function EduPage() {
  return <EduClient />
}

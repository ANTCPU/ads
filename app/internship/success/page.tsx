// ============================================================
// app/internship/success/page.tsx
// Post-registration confirmation page
//
// Receives ?name=...&track=... from /internship/join redirect.
// Warm, immediate, clear next actions.
// Server component wrapper + client inner for useSearchParams.
// ============================================================

import { Suspense } from 'react';
import SuccessClient from './SuccessClient';

export const metadata = {
  title: 'You\'re in — antcpu.io Internship Arena',
  description: 'Welcome to the Human in the Loop Internship Challenge. Week 1 starts now.',
  openGraph: {
    title: 'You\'re in — antcpu.io Internship Arena',
    description: 'Welcome to the Human in the Loop Internship Challenge. Week 1 starts now.',
    url: 'https://antcpu-ads.vercel.app/internship/success',
    siteName: 'ANTCPU ADS',
    images: [{ url: 'https://antcpu-ads.vercel.app/og-internchallenge.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://antcpu-ads.vercel.app/og-internchallenge.jpg'],
  },
};


export default function InternshipSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '4rem 1.5rem', fontFamily: 'system-ui,sans-serif', color: '#9ca3af', textAlign: 'center' }}>
        Loading...
      </div>
    }>
      <SuccessClient />
    </Suspense>
  );
}

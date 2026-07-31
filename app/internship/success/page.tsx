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

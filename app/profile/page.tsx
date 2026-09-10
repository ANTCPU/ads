'use client';
// app/profile/page.tsx — redirect to /profile/[slug]

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileRedirect() {
  const router = useRouter();
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.replace('/'); return; }
    try {
      const { email } = JSON.parse(stored);
      if (!email) { router.replace('/'); return; }
      router.replace(`/profile/${encodeURIComponent(email)}`);
    } catch {
      router.replace('/');
    }
  }, []);
  return null;
}

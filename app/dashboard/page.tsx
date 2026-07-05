'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('arena_user');
      if (!stored) { router.push('/'); return; }
      const u = JSON.parse(stored);
      if (u.email === 'antcpu@gmail.com') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/user');
      }
    } catch {
      router.push('/');
    }
  }, []);

  return null;
}

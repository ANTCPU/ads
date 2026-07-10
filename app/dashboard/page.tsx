'use client';

// ─── Dashboard Redirect ───────────────────────────────────────────────────────
// Reads arena_user from localStorage and routes based on role.
// super → /dashboard/admin
// admin → /dashboard/users
// team | user → /dashboard/user
// unauthenticated → /
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SessionUser = {
  email: string;
  name: string;
  brand: string;
  trialStatus: string;
  role?: string;
};

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('arena_user');
      if (!stored) { router.push('/'); return; }
      const u: SessionUser = JSON.parse(stored);
      if (u.role === 'super' || u.email === 'antcpu@gmail.com') {
        router.push('/dashboard/admin');
      } else if (u.role === 'admin') {
        router.push('/dashboard/users');
      } else {
        router.push('/dashboard/user');
      }
    } catch {
      router.push('/');
    }
  }, []);

  return null;
}

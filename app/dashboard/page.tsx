'use client';

// ─── Dashboard Redirect ───────────────────────────────────────────────────────
// Reads arena_user from localStorage and routes based on role only.
// super → /dashboard/admin
// admin → /dashboard/users
// team | user → /dashboard/user
// unauthenticated → /
// No email hardcoding — role is the single source of truth, set at login.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SessionUser = {
  email: string;
  name: string;
  brand: string;
  trialStatus: string;
  role: string; // required — set by persistSession/writeSession at login
};

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('arena_user');
      if (!stored) { router.push('/'); return; }
      const u: SessionUser = JSON.parse(stored);
      if (u.role === 'super')       { router.push('/dashboard/admin'); return; }
      if (u.role === 'admin')       { router.push('/dashboard/users'); return; }
      router.push('/dashboard/user');
    } catch {
      router.push('/');
    }
  }, []);

  return null;
}

// app/modules/layout.tsx
// ─── Super admin guard for /modules route ─────────────────────────────────────
// Redirects non-super users to /dashboard/user.
// Client-side check — same pattern as /dashboard/antcpu.
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      const superEmail = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';
      const isSuper = u.role === 'super' || (superEmail && u.email === superEmail);
      if (!isSuper) router.push('/dashboard/user');
    } catch {
      router.push('/');
    }
  }, [router]);

  return <>{children}</>;
}

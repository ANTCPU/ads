'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateAdDrawer from '../components/CreateAdDrawer';

export default function CreateAdPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try { setUser(JSON.parse(stored)); } catch { router.push('/'); }
    setHydrated(true);
  }, []);

  if (!hydrated || !user) return null;

  return (
    <CreateAdDrawer
      open={true}
      onClose={() => router.back()}
      user={user}
      onSuccess={() => router.push('/dashboard/user')}
    />
  );
}

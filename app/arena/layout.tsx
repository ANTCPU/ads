'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pingActivity } from '../../lib/pingActivity';

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const slug = pathname.split('/').filter(Boolean)[1];
    const label = slug ? `Visited arena — ${slug}` : 'Visited arena';
    pingActivity({ label, icon: '⚡', type: 'nav' });
  }, [pathname]);

  return <>{children}</>;
}

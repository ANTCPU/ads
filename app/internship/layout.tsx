'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pingActivity } from '../../lib/pingActivity';

const PAGE_LABELS: Record<string, { label: string; icon: string }> = {
  '/internship/week':   { label: 'Viewed week tasks',      icon: '📋' },
  '/internship/submit': { label: 'Opened submission page', icon: '📝' },
  '/internship/arena':  { label: 'Visited internship arena', icon: '🏟' },
  '/internship/collab': { label: 'Visited collab hub',     icon: '🦋' },
  '/internship/join':   { label: 'Viewed join page',       icon: '🚪' },
  '/internship':        { label: 'Visited internship hub', icon: '🎓' },
};

function getPageMeta(path: string) {
  for (const [key, val] of Object.entries(PAGE_LABELS)) {
    if (path.startsWith(key)) return val;
  }
  return { label: 'Visited internship', icon: '🎓' };
}

export default function InternshipLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const meta = getPageMeta(pathname);
    // week number from path e.g. /internship/week/3
    const weekMatch = pathname.match(/\/week\/(\d+)/);
    const label = weekMatch
      ? `Viewed Week ${weekMatch[1]} tasks`
      : meta.label;
    pingActivity({ label, icon: meta.icon, type: 'nav' });
  }, [pathname]);

  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { pingActivity } from '../../lib/pingActivity';

export default function ChampionsLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    pingActivity({ label: 'Viewed leaderboard', icon: '🏆', type: 'nav' });
  }, []);

  return <>{children}</>;
}

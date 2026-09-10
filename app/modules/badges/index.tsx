// app/modules/badges/index.tsx
'use client';

import { useEffect, useState } from 'react';
import { ModuleContext } from '../types';
import { BADGE_REGISTRY, BadgeDef } from '../../lib/badges';

type UserBadge = { badge_slug: string; awarded_at: string };

const TIER_LABELS: Record<number, string> = {
  1: 'Identity',
  2: 'Action',
  3: 'Loyalty',
  4: 'Status',
};

export default function BadgesModule({ user, supabase }: ModuleContext) {
  const [badges,  setBadges]  = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.email) { setLoading(false); return; }
    supabase
      .from('user_badges')
      .select('badge_slug, awarded_at')
      .eq('user_email', user.email.trim().toLowerCase())
      .order('awarded_at', { ascending: false })
      .then(({ data }) => {
        setBadges(data || []);
        setLoading(false);
      });
  }, [user.email]);

  const earned = badges
    .map(b => ({ ...b, def: BADGE_REGISTRY.find(d => d.slug === b.badge_slug) }))
    .filter((b): b is UserBadge & { def: BadgeDef } => !!b.def);

  // Group by tier
  const byTier = [1, 2, 3, 4].map(tier => ({
    tier,
    label: TIER_LABELS[tier],
    badges: earned.filter(b => b.def.tier === tier),
  })).filter(g => g.badges.length > 0);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
        🏅 Badges
      </div>
      <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '1rem' }}>
        {loading ? '…' : earned.length > 0
          ? `${earned.length} badge${earned.length !== 1 ? 's' : ''} earned`
          : 'No badges yet — start engaging in the Arena'}
      </div>

      {loading ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>Loading...</div>
      ) : earned.length === 0 ? (
        <div style={{ color: '#333', fontSize: '0.8rem', padding: '0.5rem 0' }}>
          Share, like, boost, or react to earn your first badge.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {byTier.map(group => (
            <div key={group.tier}>
              <div style={{
                fontSize: '0.6rem', fontWeight: 700, color: '#444',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}>
                Tier {group.tier} — {group.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {group.badges.map(b => (
                  <div
                    key={b.badge_slug}
                    title={b.def.desc}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '0.35rem',
                      background:   'transparent',
                      border:       '1px solid #222',
                      borderRadius: '999px',
                      padding:      '0.25rem 0.65rem',
                      cursor:       'default',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>{b.def.icon}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ccc' }}>
                      {b.def.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

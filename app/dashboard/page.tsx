'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ANTCPU_KB from '../clients/antcpu/kb';
import { MAPOFPI_KB } from '../clients/mapofpi/kb';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const agentClients = [
  {
    id: 'mapofpi',
    name: MAPOFPI_KB.name,
    url: MAPOFPI_KB.url,
    version: `v${MAPOFPI_KB.version}`,
    status: 'active',
    bots: 10, done: 3,
    icon: '🗺️',
    tag: `Pi Commerce · ${MAPOFPI_KB.stats.users}`,
    color: '#f0883e',
    actions: [
      { label: '🐜 Agent Dashboard', path: '/dashboard/mapofpi' },
      { label: '📋 Post Builder', path: '/dashboard/mapofpi/post-builder' },
    ],
  },
  {
    id: 'antcpu',
    name: ANTCPU_KB.name,
    url: ANTCPU_KB.url,
    version: ANTCPU_KB.version,
    status: 'active',
    bots: 10, done: 0,
    icon: '⚡',
    tag: 'AI Platform · Goal 1',
    color: '#0070f3',
    actions: [
      { label: '🐜 Agent Dashboard', path: '/dashboard/antcpu' },
      { label: '🖼 Post Preview', path: '/dashboard/antcpu/post-preview' },
    ],
  },
];

const TIER_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  entry:    { color: '#0070f3', label: 'Entry',    icon: '📝' },
  rising:   { color: '#7928ca', label: 'Rising',   icon: '🖼' },
  featured: { color: '#ff0080', label: 'Featured', icon: '🎬' },
  toptier:  { color: '#f0883e', label: 'Top Tier', icon: '☁️' },
};

const STATUS_COLOR: Record<string, string> = {
  active: '#3fb950', pending_review: '#d29922', idle: '#444',
};

type Ad = {
  id: string; email: string; name: string; brand: string;
  title: string; url: string; description: string; category: string;
  status: string; trial_status: string; tier: string;
  pinned: boolean; created_at: string;
};

export default function DashboardHome() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ email: string; brand: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
        setCurrentUser(u);
      } catch { router.push('/dashboard/user'); }
    }
    fetchAds();
  }, []);

  async function fetchAds() {
    setLoadingAds(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    setAds(data || []);
    setLoadingAds(false);
  }

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f0883e', letterSpacing: '0.05em' }}>⚡ ANTCPU ADS</div>
          <div style={{ fontSize: '0.7rem', color: '#444', letterSpacing: '0.1em' }}>AGENT DASHBOARD</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: '1px solid #1a1a1a', color: '#555', borderRadius: '8px', padding: '0.5rem 1.1rem', cursor: 'pointer', fontSize: '0.8rem' }}>
            ⚡ Arena
          </button>
          <button onClick={() => router.push('/dashboard/new')} style={{ background: '#f0883e', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem 1.1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            + New Client
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>

        {/* Client Cards */}
        <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>Agent Clients</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {agentClients.map(c => (
            <div key={c.id} style={{ background: '#111', border: `1px solid ${c.color}22`, borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: c.color }} />
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '2rem' }}>{c.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.15rem' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COLOR[c.status], display: 'inline-block', marginRight: '0.4rem' }} />
                      {c.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#555' }}>{c.tag}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: c.color, fontWeight: 700 }}>{c.version}</div>
                </div>

                {/* Bot progress */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#444', marginBottom: '0.4rem' }}>
                    <span>Antbot Pod</span>
                    <span>{c.done}/{c.bots} bots run</span>
                  </div>
                  <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '2px' }}>
                    <div style={{ height: '100%', background: c.color, borderRadius: '2px', width: `${(c.done / c.bots) * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {c.actions.map(a => (
                    <button key={a.path} onClick={() => router.push(a.path)}
                      style={{ flex: 1, background: a.label.includes('Post') ? c.color : 'none', border: a.label.includes('Post') ? 'none' : `1px solid ${c.color}44`, color: a.label.includes('Post') ? '#fff' : c.color, borderRadius: '8px', padding: '0.5rem 0.5rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Arena Feed */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase' }}>All Ads — The Arena</div>
          <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: 'none', color: '#444', fontSize: '0.75rem', cursor: 'pointer' }}>View full arena →</button>
        </div>

        {loadingAds ? (
          <div style={{ color: '#333', fontSize: '0.85rem', padding: '1rem 0' }}>Loading ads...</div>
        ) : ads.length === 0 ? (
          <div style={{ color: '#333', fontSize: '0.85rem', padding: '1rem 0' }}>No ads yet.</div>
        ) : (
          ads.map(ad => {
            const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
            const isOwn = currentUser?.email === ad.email;
            return (
              <div key={ad.id} style={{
                background: '#111',
                border: ad.pinned ? '1px solid #f0883e33' : isOwn ? `1px solid ${tier.color}33` : '1px solid #1a1a1a',
                borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '0.75rem', position: 'relative',
                boxShadow: ad.tier === 'featured' ? '0 0 24px #ff008018' : 'none',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: tier.color, borderRadius: '14px 14px 0 0' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `${tier.color}20`, border: `1px solid ${tier.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                      {tier.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ad.brand}</div>
                      <div style={{ fontSize: '0.7rem', color: '#555' }}>{ad.category}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {ad.pinned && <span style={{ fontSize: '0.65rem', color: '#f0883e', background: '#f0883e15', border: '1px solid #f0883e30', borderRadius: '999px', padding: '0.15rem 0.5rem' }}>📌 PINNED</span>}
                    {isOwn && <span style={{ fontSize: '0.65rem', color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}30`, borderRadius: '999px', padding: '0.15rem 0.5rem' }}>YOUR AD</span>}
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}30`, borderRadius: '999px', padding: '0.2rem 0.6rem' }}>{tier.label.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.4rem' }}>{ad.title}</div>
                <div style={{ color: '#666', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{ad.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <a href={ad.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: tier.color, textDecoration: 'none', fontWeight: 600 }}>{ad.url} →</a>
                  <div style={{ fontSize: '0.65rem', color: STATUS_COLOR[ad.status] || '#444', fontWeight: 700, letterSpacing: '0.08em' }}>
                    {ad.status === 'active' ? '🟢 LIVE' : ad.status === 'pending_review' ? '🟡 REVIEW' : ad.status.toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Upgrade teaser */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem', marginTop: '1rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>Upgrade Your Ad</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { tier: 'Rising',   desc: 'Custom image',     color: '#7928ca' },
              { tier: 'Featured', desc: 'Video ad',          color: '#ff0080' },
              { tier: 'Top Tier', desc: 'antcpu.com/cloud',  color: '#f0883e' },
            ].map(t => (
              <div key={t.tier} style={{ flex: 1, minWidth: '140px', background: '#0a0a0a', border: `1px solid ${t.color}22`, borderRadius: '10px', padding: '0.85rem 1rem', opacity: 0.5 }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: t.color, marginBottom: '0.2rem' }}>{t.tier}</div>
                <div style={{ fontSize: '0.72rem', color: '#555' }}>{t.desc}</div>
                <div style={{ fontSize: '0.65rem', color: '#333', marginTop: '0.4rem' }}>coming soon</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '3rem', fontSize: '0.7rem', color: '#2a2a2a', textAlign: 'center' }}>antcpu.com · ANTCPU ADS v0.5 · demo build</div>
      </div>
    </div>
  );
}

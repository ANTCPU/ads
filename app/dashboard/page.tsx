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
  { id: 'antcpu',  name: ANTCPU_KB.name,     url: ANTCPU_KB.url,     version: ANTCPU_KB.version,         status: 'active', bots: 10, done: 0,  icon: '⚡',  tag: 'AI Platform · Goal 1' },
  { id: 'mapofpi', name: MAPOFPI_KB.name,    url: MAPOFPI_KB.url,    version: `v${MAPOFPI_KB.version}`,  status: 'active', bots: 10, done: 3,  icon: '🗺️', tag: `Pi Commerce · ${MAPOFPI_KB.stats.users}` },
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
    if (stored) { try { setCurrentUser(JSON.parse(stored)); } catch {} }
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

  const s: Record<string, React.CSSProperties> = {
    page:     { background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: '700px', margin: '0 auto' },
    logo:     { fontWeight: 800, fontSize: '1.1rem', color: '#f0883e', letterSpacing: '0.05em', marginBottom: '0.25rem' },
    sub:      { fontSize: '0.75rem', color: '#444', letterSpacing: '0.1em', marginBottom: '2.5rem' },
    heading:  { fontSize: '0.7rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '1rem' },
    card:     { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    adCard:   { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1rem' },
    newBtn:   { width: '100%', background: 'none', border: '1px dashed #222', borderRadius: '14px', padding: '1.1rem', color: '#333', fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.5rem', marginBottom: '3rem' },
    footer:   { marginTop: '3rem', fontSize: '0.7rem', color: '#2a2a2a', textAlign: 'center' as const },
    divider:  { borderTop: '1px solid #1a1a1a', margin: '2rem 0' },
  };

  return (
    <div style={s.page}>
      <div style={s.logo}>⚡ ANTCPU ADS</div>
      <div style={s.sub}>AGENT DASHBOARD</div>

      {/* ── Agent Clients ── */}
      <div style={s.heading}>Agent Clients</div>
      {agentClients.map(c => (
        <div key={c.id} style={s.card}
          onClick={() => router.push(`/dashboard/${c.id}`)}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#f0883e44')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a1a1a')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '1.8rem' }}>{c.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COLOR[c.status], display: 'inline-block', marginRight: '0.4rem' }} />
                {c.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#555' }}>{c.tag}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: '0.75rem', color: '#f0883e', fontWeight: 700, marginBottom: '0.3rem' }}>{c.version}</div>
            <div style={{ fontSize: '0.7rem', color: '#444' }}>{c.done}/{c.bots} bots run</div>
            <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '2px', marginTop: '0.4rem', width: '80px' }}>
              <div style={{ height: '100%', background: '#f0883e', borderRadius: '2px', width: `${(c.done / c.bots) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
      <button style={s.newBtn} onClick={() => router.push('/dashboard/new')}>+ New Client</button>

      <div style={s.divider} />

      {/* ── All Ads Feed ── */}
      <div style={s.heading}>All Ads — The Arena</div>

      {loadingAds ? (
        <div style={{ color: '#333', fontSize: '0.85rem', padding: '1rem 0' }}>Loading ads...</div>
      ) : ads.length === 0 ? (
        <div style={{ color: '#333', fontSize: '0.85rem', padding: '1rem 0' }}>No ads yet. Be the first.</div>
      ) : (
        ads.map(ad => {
          const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
          const isOwn = currentUser?.email === ad.email;
          return (
            <div key={ad.id} style={{
              ...s.adCard,
              borderColor: ad.pinned ? '#f0883e33' : isOwn ? `${tier.color}33` : '#1a1a1a',
              position: 'relative' as const,
            }}>
              {/* Tier accent */}
              <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: '2px', background: tier.color, borderRadius: '14px 14px 0 0' }} />

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
                <a href={ad.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.78rem', color: tier.color, textDecoration: 'none', fontWeight: 600 }}>
                  {ad.url} →
                </a>
                <div style={{ fontSize: '0.65rem', color: STATUS_COLOR[ad.status] || '#444', fontWeight: 700, letterSpacing: '0.08em' }}>
                  {ad.status === 'active' ? '🟢 LIVE' : ad.status === 'pending_review' ? '🟡 REVIEW' : ad.status.toUpperCase()}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Tier upgrade teaser */}
      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem', marginTop: '1rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem' }}>Upgrade Your Ad</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const }}>
          {[
            { tier: 'Rising',   desc: 'Custom image',  color: '#7928ca', soon: true },
            { tier: 'Featured', desc: 'Video ad',       color: '#ff0080', soon: true },
            { tier: 'Top Tier', desc: 'antcpu.com/cloud', color: '#f0883e', soon: true },
          ].map(t => (
            <div key={t.tier} style={{ flex: 1, minWidth: '140px', background: '#0a0a0a', border: `1px solid ${t.color}22`, borderRadius: '10px', padding: '0.85rem 1rem', opacity: 0.5 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: t.color, marginBottom: '0.2rem' }}>{t.tier}</div>
              <div style={{ fontSize: '0.72rem', color: '#555' }}>{t.desc}</div>
              <div style={{ fontSize: '0.65rem', color: '#333', marginTop: '0.4rem' }}>coming soon</div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.footer}>antcpu.com · ads agent v1</div>
    </div>
  );
}

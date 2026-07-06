'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';
import { createClient } from '@supabase/supabase-js';
import ArenaFooter from '../../components/ArenaFooter';
import CreateAdDrawer from '../../components/CreateAdDrawer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TEAM = [
  { name: 'Antony Ciccone', email: 'antcpu@gmail.com', brand: 'ANTCPU', role: 'Founder', icon: '⚡' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [stats, setStats] = useState<{ lastSignup: string; ads: number; team: number }>({ lastSignup: '—', ads: 0, team: 1 });
  const [signups, setSignups] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const cookie = document.cookie.split(';').map(c => c.trim())
      .find(c => c.startsWith('arena_session='));
    if (!cookie) { router.push('/'); return; }
    try {
      const u = JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')));
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
    } catch { router.push('/'); return; }
    setHydrated(true);
    loadData();
  }, []);

  async function loadData() {
    const [{ count: adCount }, { data: recentSignups }, { data: recentClicks }] = await Promise.all([
      supabase.from('ads').select('*', { count: 'exact', head: true }),
      supabase.from('ad_signups').select('name, email, brand_name, status, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('ad_clicks').select('ad_id, email, source, created_at').order('created_at', { ascending: false }).limit(15),
    ]);
    const lastSignup = recentSignups?.[0]?.brand_name || recentSignups?.[0]?.name || '—';
    setStats({ lastSignup, ads: adCount || 0, team: 1 });
    setSignups(recentSignups || []);
    setClicks(recentClicks || []);
  }

  if (!hydrated) return null;

  return (
    <div style={{ background: '#fff', color: '#0a0a0a', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ArenaNav
        role="admin"
        userName="Antony Ciccone"
        userEmail="antcpu@gmail.com"
        userBrand="ANTCPU"
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* HEADER */}
        <SectionHeader title="⚡ Admin Hub" sub="ANTCPU ADS — internal control center" />

        {/* ── ARENA ── */}
        <p style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0.5rem 0 0.4rem' }}>Arena</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Pill label="🏟 User Dashboard" onClick={() => router.push('/dashboard/user')} color="#0070f3" outline />
          <Pill label="🏆 Leaderboard" onClick={() => router.push('/dashboard/leaderboard')} color="#0070f3" outline />
          <Pill label="📢 Create Ad" onClick={() => setDrawerOpen(true)} color="#0070f3" outline />
        </div>

        {/* ── ADMIN TOOLS ── */}
        <p style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0.5rem 0 0.4rem' }}>Admin Tools</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Pill label="👥 Users" onClick={() => router.push('/dashboard/users')} color="#f0883e" outline />
          <Pill label="🤖 Agents" onClick={() => router.push('/dashboard/agents')} color="#f0883e" outline />
          <Pill label="🦋 Approval Queue" onClick={() => router.push('/dashboard/antcpu')} color="#f0883e" outline />
          <Pill label="🧪 Arena Status" onClick={() => router.push('/dashboard/test')} color="#f0883e" outline />
          <Pill label="➕ New Client" onClick={() => router.push('/dashboard/new')} color="#f0883e" outline />
        </div>

        {/* ── BRAND DASHBOARDS ── */}
        <p style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0.5rem 0 0.4rem' }}>Brand Dashboards</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Pill label="🗺️ Map of Pi" onClick={() => router.push('/dashboard/mapofpi')} color="#D4AF37" outline />
          <Pill label="📸 Photography" onClick={() => router.push('/dashboard/photography')} color="#e91e8c" outline />
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Last Signup', value: stats.lastSignup, icon: '🕐', color: '#0070f3' },
            { label: 'Active Ads',  value: stats.ads,        icon: '📢', color: '#f0883e' },
            { label: 'Team',        value: stats.team,       icon: '⚡', color: '#7928ca' },
          ].map(s => (
            <Card key={s.label}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem' }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.68rem', color: '#888' }}>{s.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* TEAM */}
        <SectionHeader title="👤 Team" sub="ANTCPU core" />
        {TEAM.map(m => (
          <Card key={m.email}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{m.email} · {m.brand}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: '#fff8f0', color: '#f0883e', border: '1px solid #f0883e40', borderRadius: '999px', padding: '0.15rem 0.6rem', fontWeight: 700 }}>
                ✅ Unlimited · {m.role}
              </span>
            </div>
          </Card>
        ))}

        {/* EARLY ADOPTERS */}
        <div style={{ background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0a0a0a' }}>⚡ Early Adopters</div>
            <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>The first brands in the Arena</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#f0883e' }}>{signups.length}</div>
        </div>

        {/* CREATE AD */}
        <SectionHeader title="📢 Create Ad" sub="Place an ad for any brand" />
        <Pill label="📢 Open Ad Builder" onClick={() => setDrawerOpen(true)} color="#f0883e" />

        <CreateAdDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          user={{ name: 'Antony Ciccone', email: 'antcpu@gmail.com', brand: 'ANTCPU', trialStatus: 'team' }}
          onSuccess={() => { setDrawerOpen(false); loadData(); }}
        />

        <ArenaFooter />
      </div>
    </div>
  );
}

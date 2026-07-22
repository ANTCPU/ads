'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../../components/ArenaNav';
import { clearSessionCookie } from '../../lib/session';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Signup = {
  name: string; email: string; brand_name: string;
  status: string; role: string; promo_code: string;
  is_country_champion: boolean; created_at: string;
};
type Ad = {
  id: string; brand: string; title: string; country: string;
  points: number; click_count: number; share_count: number;
  is_country_champion: boolean; status: string; tier: string;
  email: string; created_at: string;
};
type CountryRow = { country: string; shops: number; total_points: number; has_champion: boolean };
type PromoRow   = { promo_code: string; total: number; active: number; champions: number; last_signup: string };

// ─── Styles ───────────────────────────────────────────────────────────────────
const bg    = '#0a0a0a';
const card  = '#111';
const bdr   = '#1a1a1a';
const muted = '#555';
const orange = '#f0883e';
const gold   = '#D4AF37';
const green  = '#22c55e';
const blue   = '#0070f3';

const S: Record<string, React.CSSProperties> = {
  page:    { minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' },
  inner:   { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.25rem' },
  card:    { background: card, border: `1px solid ${bdr}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' },
  label:   { fontSize: '0.68rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' },
  grid2:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' },
  grid4:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' },
  statCard: { background: card, border: `1px solid ${bdr}`, borderRadius: 10, padding: '1rem', textAlign: 'center' as const },
  btn:     { background: 'transparent', border: `1px solid ${bdr}`, color: '#aaa', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 },
  input:   { flex: 1, minWidth: 200, background: '#0a0a0a', border: `1px solid #222`, borderRadius: 8, padding: '0.6rem 1rem', color: '#fff', fontSize: '0.85rem', outline: 'none' },
  row:     { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: `1px solid ${bdr}` },
};
const tag = (c: string): React.CSSProperties => ({
  background: `${c}15`, border: `1px solid ${c}30`, color: c,
  borderRadius: 999, padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700,
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [hydrated, setHydrated]   = useState(false);
  const [user, setUser]           = useState({ email: '', name: '', brand: '', trialStatus: 'team' });
  const [signups, setSignups]     = useState<Signup[]>([]);
  const [ads, setAds]             = useState<Ad[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [promos, setPromos]       = useState<PromoRow[]>([]);
  const [adminEmail, setAdminEmail] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');
  const [tab, setTab]             = useState<'champions'|'funnel'|'rising'|'tools'>('champions');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('arena_user');
      if (!stored) { router.push('/'); return; }
      const u = JSON.parse(stored);
      if (u.role !== 'super') { router.push('/dashboard/user'); return; }
      setUser(u);
    } catch { router.push('/'); return; }
    setHydrated(true);
    loadData();
  }, []);

  async function loadData() {
    const [
      { data: signupData },
      { data: adData },
    ] = await Promise.all([
      supabase.from('ad_signups')
        .select('name, email, brand_name, status, role, promo_code, is_country_champion, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('ads')
        .select('id, brand, title, country, points, click_count, share_count, is_country_champion, status, tier, email, created_at')
        .eq('status', 'active')
        .order('points', { ascending: false }),
    ]);

    const s = signupData || [];
    const a = adData || [];
    setSignups(s);
    setAds(a);

    // Build country summary from ads
    const cMap: Record<string, CountryRow> = {};
    for (const ad of a) {
      const c = ad.country || 'Unknown';
      if (!cMap[c]) cMap[c] = { country: c, shops: 0, total_points: 0, has_champion: false };
      cMap[c].shops++;
      cMap[c].total_points += ad.points || 0;
      if (ad.is_country_champion) cMap[c].has_champion = true;
    }
    setCountries(Object.values(cMap).sort((a, b) => b.total_points - a.total_points));

    // Build promo summary from signups
    const pMap: Record<string, PromoRow> = {};
    for (const sg of s) {
      const p = sg.promo_code || 'none';
      if (!pMap[p]) pMap[p] = { promo_code: p, total: 0, active: 0, champions: 0, last_signup: sg.created_at };
      pMap[p].total++;
      if (sg.status === 'active') pMap[p].active++;
      if (sg.is_country_champion) pMap[p].champions++;
    }
    setPromos(Object.values(pMap).sort((a, b) => b.total - a.total));
  }

  async function assignRole(email: string, grant: boolean) {
    if (!email.trim()) return;
    setAssigning(true); setAssignMsg('');
    const { error } = await supabase.from('ad_signups')
      .update({ role: grant ? 'admin' : 'user' })
      .eq('email', email.trim().toLowerCase());
    setAssignMsg(error ? `❌ ${error.message}` : grant ? `✅ ${email} is now admin` : `✅ ${email} reset to user`);
    if (!error) { setAdminEmail(''); loadData(); }
    setAssigning(false);
  }

  if (!hydrated) return null;

  // — derived stats
  const totalAds       = ads.length;
  const totalSignups   = signups.length;
  const champions      = ads.filter(a => a.is_country_champion).length;
  const activeTrials   = signups.filter(s => s.status === 'active').length;
  const mapofpiSignups = promos.find(p => p.promo_code === 'MAPOFPI')?.total || 0;
  const risingAds      = [...ads].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
  const champAds       = ads.filter(a => a.is_country_champion);

  const TABS = [
    { id: 'champions', label: `🏆 Champions (${champAds.length})` },
    { id: 'funnel',    label: `📡 Campaign Funnel` },
    { id: 'rising',    label: `🔥 Rising Ads` },
    { id: 'tools',     label: `⚙️ Tools` },
  ] as const;

  return (
    <div style={S.page}>
      <ArenaNav
        user={user}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />
      <div style={S.inner}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: muted, marginBottom: 4 }}>⚡ SUPER ADMIN · {user.email}</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Arena Dashboard</h1>
        </div>

        {/* ── Stats bar ── */}
        <div style={S.grid4}>
          {[
            { label: 'Active Ads',     value: totalAds,       color: orange },
            { label: 'Total Signups',  value: totalSignups,   color: blue },
            { label: 'Champions',      value: champions,      color: gold },
            { label: 'Active Trials',  value: activeTrials,   color: green },
            { label: 'MoP Signups',    value: mapofpiSignups, color: '#D4AF37' },
            { label: 'Countries',      value: countries.length, color: '#7928ca' },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: muted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Quick nav ── */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            { label: '🏟 Arena',       path: '/arena' },
            { label: '👥 Users',       path: '/dashboard/users' },
            { label: '🗺️ Map of Pi',   path: '/dashboard/mapofpi' },
            { label: '📸 Amanda',      path: '/dashboard/photography' },
            { label: '⚡ ANTCPU',      path: '/dashboard/antcpu' },
          ].map(l => (
            <button key={l.path} onClick={() => router.push(l.path)} style={S.btn}>{l.label}</button>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ ...S.btn, background: tab === t.id ? orange : 'transparent', color: tab === t.id ? '#000' : '#aaa', border: `1px solid ${tab === t.id ? orange : bdr}` }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Champions tab ── */}
        {tab === 'champions' && (
          <div style={S.card}>
            <div style={S.label}>Country Champions — {champAds.length} active</div>

            {/* Country coverage */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '0.5rem' }}>COUNTRY COVERAGE</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {countries.map(c => (
                  <div key={c.country} style={{ background: c.has_champion ? `${gold}15` : '#1a1a1a', border: `1px solid ${c.has_champion ? gold : bdr}`, borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                    <span style={{ color: c.has_champion ? gold : muted }}>{c.country}</span>
                    <span style={{ color: muted, marginLeft: 6 }}>{c.shops} shops · {c.total_points}pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Champion ads */}
            {champAds.length === 0 ? (
              <div style={{ color: muted, fontSize: '0.85rem' }}>No champions yet.</div>
            ) : champAds.map(ad => (
              <div key={ad.id} style={S.row}>
                <span style={{ fontSize: '1rem' }}>🏆</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</div>
                  <div style={{ fontSize: '0.7rem', color: muted }}>{ad.brand} · {ad.country || 'No country'} · {ad.email}</div>
                </div>
                <span style={tag(gold)}>{ad.points} pts</span>
                <span style={tag(blue)}>{ad.tier}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Campaign Funnel tab ── */}
        {tab === 'funnel' && (
          <div style={S.card}>
            <div style={S.label}>Campaign Funnel</div>

            {/* Promo breakdown */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '0.5rem' }}>BY PROMO CODE</div>
              {promos.map(p => (
                <div key={p.promo_code} style={{ ...S.row, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: orange }}>{p.promo_code}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={tag(blue)}>{p.total} signups</span>
                    <span style={tag(green)}>{p.active} active</span>
                    <span style={tag(gold)}>{p.champions} champions</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: muted }}>{new Date(p.last_signup).toLocaleDateString()}</span>
                </div>
              ))}
            </div>

            {/* Recent signups */}
            <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '0.5rem' }}>RECENT SIGNUPS</div>
            {signups.slice(0, 20).map((s, i) => (
              <div key={i} style={S.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.brand_name || s.name || '—'}</div>
                  <div style={{ fontSize: '0.7rem', color: muted }}>{s.email} · {s.promo_code || 'no promo'}</div>
                </div>
                <span style={tag(s.status === 'active' ? green : muted)}>{s.status || 'no status'}</span>
                {s.is_country_champion && <span style={tag(gold)}>🏆</span>}
                <span style={{ fontSize: '0.68rem', color: muted }}>{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Rising Ads tab ── */}
        {tab === 'rising' && (
          <div style={S.card}>
            <div style={S.label}>Rising Ads — Top 10 by Points</div>
            {risingAds.map((ad, i) => (
              <div key={ad.id} style={S.row}>
                <span style={{ fontSize: '0.85rem', color: muted, width: 20, textAlign: 'center' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</div>
                  <div style={{ fontSize: '0.7rem', color: muted }}>{ad.brand} · {ad.country || '—'}</div>
                </div>
                <span style={tag(orange)}>{ad.points} pts</span>
                <span style={tag(blue)}>👆 {ad.click_count || 0}</span>
                <span style={tag('#7928ca')}>↗ {ad.share_count || 0}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Tools tab ── */}
        {tab === 'tools' && (
          <div>
            {/* Assign role */}
            <div style={S.card}>
              <div style={S.label}>Assign / Revoke Role</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                  placeholder="user@email.com" style={S.input} />
                <button onClick={() => assignRole(adminEmail, true)} disabled={assigning || !adminEmail.trim()}
                  style={{ background: blue, border: 'none', color: '#fff', borderRadius: 8, padding: '0.6rem 1.25rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }}>
                  Grant Admin
                </button>
                <button onClick={() => assignRole(adminEmail, false)} disabled={assigning || !adminEmail.trim()}
                  style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 8, padding: '0.6rem 1.25rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }}>
                  Revoke
                </button>
              </div>
              {assignMsg && <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: assignMsg.startsWith('✅') ? green : '#ef4444' }}>{assignMsg}</div>}
            </div>

            {/* Current admins */}
            <div style={S.card}>
              <div style={S.label}>Current Admins</div>
              {signups.filter(s => s.role === 'admin' || s.role === 'super').map((s, i) => (
                <div key={i} style={S.row}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.name || s.email}</div>
                    <div style={{ fontSize: '0.7rem', color: muted }}>{s.email}</div>
                  </div>
                  <span style={tag(s.role === 'super' ? orange : blue)}>
                    {s.role === 'super' ? '⚡ Super' : '🔑 Admin'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

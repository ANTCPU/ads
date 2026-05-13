'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TEAM = [
  { name: 'Antony Ciccone',     email: 'antcpu@gmail.com',      brand: 'ANTCPU',      role: 'Admin', icon: '⚡' },
  { name: 'Amanda Mishoe',      email: 'mishoemanda@gmail.com', brand: 'Photography', role: 'Team',  icon: '📸' },
  { name: 'Mohamed Elshoshani', email: 'melshoshani@gmail.com', brand: 'MAP OF PI',   role: 'Team',  icon: '🗺️' },
];

const CATEGORIES = ['Brand Awareness','Product Launch','Pi Commerce','Photography','Content Promotion','Service Offering','Event','Other'];
const TIERS = [
  { value: 'entry',    label: 'Entry' },
  { value: 'rising',   label: 'Rising' },
  { value: 'featured', label: 'Featured' },
  { value: 'toptier',  label: 'Top Tier' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [stats, setStats] = useState({ users: 0, ads: 0, team: 3 });
  const [signups, setSignups] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', url: '', description: '', category: 'Brand Awareness', tier: 'entry', email: 'antcpu@gmail.com', brand: 'ANTCPU' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clicks, setClicks] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
    } catch { router.push('/'); return; }
    setHydrated(true);
    loadData();
  }, []);

  async function loadData() {
    const [{ count: userCount }, { count: adCount }, { data: recentSignups }, { data: recentClicks }] = await Promise.all([
      supabase.from('ad_signups').select('*', { count: 'exact', head: true }),
      supabase.from('ads').select('*', { count: 'exact', head: true }),
      supabase.from('ad_signups').select('name, email, brand_name, status, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('ad_clicks').select('ad_id, email, source, created_at').order('created_at', { ascending: false }).limit(15),
    ]);
    setStats({ users: userCount || 0, ads: adCount || 0, team: 3 });
    setSignups(recentSignups || []);
    setClicks(recentClicks || []);
  }

  async function handleSubmitAd() {
    if (!form.title || !form.url || !form.description) return;
    setSaving(true);
    const { error } = await supabase.from('ads').insert([{
      title: form.title,
      url: form.url.startsWith('http') ? form.url : `https://${form.url}`,
      description: form.description,
      category: form.category,
      tier: form.tier,
      email: form.email,
      brand: form.brand,
      status: 'active',
      pinned: false,
    }]);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setForm(f => ({ ...f, title: '', url: '', description: '' }));
      setTimeout(() => { setSaved(false); loadData(); }, 3000);
    }
  }

  if (!hydrated) return null;
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inp: React.CSSProperties = { width: '100%', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#0a0a0a', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav role="admin" userName="Antony Ciccone" userEmail="antcpu@gmail.com" userBrand="ANTCPU" trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }} />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0a0a0a' }}>⚡ Admin Hub</div>
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.3rem' }}>ANTCPU ADS — internal control center</div>
        </div>

        <Card>
          <SectionHeader title="🗂 Quick Nav" />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { label: '🏟 Dashboard',   path: '/dashboard/user' },
              { label: '👥 Users',       path: '/dashboard/users' },
              { label: '🏆 Leaderboard', path: '/dashboard/leaderboard' },
              { label: '🤖 Agents',      path: '/dashboard/agents' },
              { label: '🗺️ Map of Pi',   path: '/dashboard/mapofpi' },
              { label: '📸 Photography', path: '/dashboard/photography' },
              { label: '📢 Create Ad',   path: '/create-ad' },
            ].map(({ label, path }) => (
              <Pill key={path} label={label} onClick={() => router.push(path)} color="#0a0a0a" outline />
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="📊 Quick Stats" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Total Signups', value: stats.users, icon: '👥', color: '#0070f3' },
              { label: 'Active Ads',    value: stats.ads,   icon: '📢', color: '#f0883e' },
              { label: 'Team Members',  value: stats.team,  icon: '⚡', color: '#7928ca' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fafafa', border: `1px solid ${s.color}20`, borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="👥 Team Members" sub="All unlimited access" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {TEAM.map(m => (
              <div key={m.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0a0a0a' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{m.email} · {m.brand}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 }}>✅ Unlimited</span>
                  <span style={{ background: m.role === 'Admin' ? '#fff7ed' : '#f5f3ff', color: m.role === 'Admin' ? '#f0883e' : '#7928ca', border: `1px solid ${m.role === 'Admin' ? '#fed7aa' : '#ddd6fe'}`, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 }}>{m.role}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="🏗 Fast Ad Builder" sub="Publish directly to the Arena" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Brand</label>
              <input style={inp} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="ANTCPU" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Email</label>
              <input style={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="antcpu@gmail.com" />
            </div>
          </div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Ad Title</label>
          <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Your ad headline..." />
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>URL</label>
          <input style={inp} value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://yoursite.com" />
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Description</label>
          <textarea style={{ ...inp, minHeight: '80px', resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What are you promoting?" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Category</label>
              <select style={{ ...inp, marginBottom: 0 }} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Tier</label>
              <select style={{ ...inp, marginBottom: 0 }} value={form.tier} onChange={e => set('tier', e.target.value)}>
                {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <Pill label={saved ? '✅ Published!' : saving ? 'Publishing...' : '🚀 Publish Ad'} onClick={handleSubmitAd} color={saved ? '#22c55e' : '#f0883e'} />
        </Card>

        <Card>
          <SectionHeader title="🟢 Recent Signups" sub="Latest 10 members" />
          {signups.length === 0 ? (
            <div style={{ color: '#888', fontSize: '0.85rem' }}>No signups yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {signups.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0a0a0a' }}>{s.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>{s.email} · {s.brand_name || 'No brand'}</div>
                  </div>
                  <span style={{ background: s.status === 'team' ? '#f0fdf4' : '#fefce8', color: s.status === 'team' ? '#16a34a' : '#ca8a04', border: `1px solid ${s.status === 'team' ? '#bbf7d0' : '#fde68a'}`, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 }}>
                    {s.status === 'team' ? '✅ Team' : '🟡 Trial'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="👆 Recent Ad Clicks" sub="Last 15 click events" />
          {clicks.length === 0 ? (
            <div style={{ color: '#888', fontSize: '0.85rem' }}>No clicks recorded yet — clicks will appear here as users interact with ads.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {clicks.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0a0a0a' }}>Ad: {c.ad_id?.slice(0, 8)}...</div>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>{c.email} · {c.source}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#888' }}>{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: '0.78rem' }}>
          ⚡ ANTCPU ADS · <a href="mailto:antcpu@gmail.com" style={{ color: '#aaa' }}>antcpu@gmail.com</a>
        </div>

      </div>
    </div>
  );
}

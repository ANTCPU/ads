'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';

const ALLOWED = [
  'antcpu@gmail.com',
  'mishoemanda@gmail.com',
];

const TEAM = [
  { name: 'Amanda Mishoe', email: 'mishoemanda@gmail.com', role: 'Lead Photographer', icon: '📸' },
];

const POSTS = [
  { id: 1, text: 'Stories Through a Lens 📸\n\nA mother and grandmother capturing life\'s most beautiful moments. Family portraits, events, and memories that last forever.\n\n→ antcpu.com/manda\n\n#photography #portraits #memories #photographer #antcpuads' },
  { id: 2, text: 'Every moment tells a story 📷\n\nFrom first steps to golden anniversaries — Amanda Photography captures the moments that matter most.\n\n→ antcpu.com/manda\n\n#photography #familyportraits #memories #photographer #antcpuads' },
  { id: 3, text: 'Book your session today 🌟\n\nProfessional photography for families, events, and special occasions. Real moments. Real memories.\n\n→ antcpu.com/manda\n\n#photography #bookasession #portraits #photographer #antcpuads' },
];

export default function PhotographyDashboard() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [customCopied, setCustomCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (!ALLOWED.includes(u.email)) { router.push('/dashboard/user'); return; }
      setUser(u);
    } catch { router.push('/'); return; }
    setHydrated(true);
  }, []);

  function copyPost(text: string, id: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  function copyCustom() {
    if (!custom.trim()) return;
    navigator.clipboard.writeText(custom).then(() => {
      setCustomCopied(true);
      setTimeout(() => setCustomCopied(false), 2500);
    });
  }

  if (!hydrated || !user) return null;
  const isAdmin = user.email === 'antcpu@gmail.com';
  const accent = '#e91e8c';

  return (
    <div style={{ background: '#0a0a0a', color: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : 'team'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* HEADER */}
        <Card>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0a0a0a' }}>📸 Amanda Photography</div>
          <div style={{ color: '#555', fontSize: '0.88rem', marginTop: '0.25rem' }}>Team dashboard — post builder + content tools</div>

          {/* NAV PILLS */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Pill label="← Dashboard" onClick={() => router.push('/dashboard/user')} color="#0a0a0a" outline />
            <Pill label="Create Ad" onClick={() => router.push('/create-ad')} color={accent} />
            <Pill label="My Profile" onClick={() => router.push(`/profile/${encodeURIComponent(user.email)}`)} color={accent} outline />
            <Pill label="Public Profile" onClick={() => router.push(`/profile/${encodeURIComponent('mishoemanda@gmail.com')}`)} color="#555" outline />
            {isAdmin && <Pill label="Admin" onClick={() => router.push('/dashboard/admin')} color="#f0883e" />}
          </div>
        </Card>

        {/* TEAM */}
        <div style={{ marginTop: '1.5rem' }}>
          {TEAM.map(m => (
            <Card key={m.email}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '2rem' }}>{m.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0a0a0a' }}>{m.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#555' }}>{m.email} · {m.role}</div>
                </div>
                <div style={{ marginLeft: 'auto', background: '#e91e8c15', border: '1px solid #e91e8c40', color: '#e91e8c', borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  ✅ Photography Team
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* POST BUILDER */}
        <SectionHeader title="Post Builder" sub="Copy a post and share it anywhere" />
        {POSTS.map(p => (
          <Card key={p.id}>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#0a0a0a', margin: 0, fontFamily: 'inherit', lineHeight: 1.6 }}>{p.text}</pre>
            <div style={{ marginTop: '0.75rem' }}>
              <Pill
                label={copiedId === p.id ? '✓ Copied' : '↗ Copy Post'}
                onClick={() => copyPost(p.text, p.id)}
                color={copiedId === p.id ? '#22c55e' : accent}
              />
            </div>
          </Card>
        ))}

        {/* CUSTOM POST */}
        <SectionHeader title="Custom Post" sub="Write your own and copy it ready to paste" />
        <Card>
          <textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Write a custom post for Amanda Photography..."
            style={{ width: '100%', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#0a0a0a', minHeight: '120px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
          />
          <div style={{ marginTop: '0.75rem' }}>
            <Pill
              label={customCopied ? '✓ Copied' : '↗ Copy Custom Post'}
              onClick={copyCustom}
              color={customCopied ? '#22c55e' : accent}
            />
          </div>
        </Card>

        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: '0.78rem' }}>
          ⚡ ANTCPU ADS · 📸 Amanda Photography
        </div>
      </div>
    </div>
  );
}

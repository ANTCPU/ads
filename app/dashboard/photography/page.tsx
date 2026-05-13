'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';

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

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : 'team'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0a0a0a' }}>📸 Amanda Photography</div>
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.3rem' }}>Team dashboard — post builder + content tools</div>
        </div>

        {/* NAV PILLS */}
        <Card>
          <SectionHeader title="🗂 Quick Nav" />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Pill label="🏟 My Dashboard"  onClick={() => router.push('/dashboard/user')}   color="#0a0a0a" outline />
            <Pill label="📢 Create Ad"     onClick={() => router.push('/create-ad')}         color="#0a0a0a" outline />
            <Pill label="👤 Profile"       onClick={() => router.push('/profile')}            color="#0a0a0a" outline />
            {isAdmin && <Pill label="⚡ Admin Hub" onClick={() => router.push('/dashboard/admin')} color="#f0883e" />}
          </div>
        </Card>

        {/* TEAM */}
        <Card>
          <SectionHeader title="👥 Photography Team" sub="Active members" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {TEAM.map(m => (
              <div key={m.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0a0a0a' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{m.email} · {m.role}</div>
                  </div>
                </div>
                <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 }}>✅ Unlimited</span>
              </div>
            ))}
          </div>
        </Card>

        {/* POST BUILDER */}
        <Card>
          <SectionHeader title="✍️ Post Builder" sub="Ready-made posts — copy and share" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {POSTS.map(p => (
              <div key={p.id} style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderLeft: '3px solid #0070f3', borderRadius: '10px', padding: '1rem' }}>
                <pre style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem', color: '#333', whiteSpace: 'pre-wrap', margin: '0 0 0.75rem 0', lineHeight: 1.6 }}>{p.text}</pre>
                <Pill
                  label={copiedId === p.id ? '✅ Copied!' : '↗ Copy Post'}
                  onClick={() => copyPost(p.text, p.id)}
                  color={copiedId === p.id ? '#22c55e' : '#0070f3'}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* CUSTOM POST */}
        <Card>
          <SectionHeader title="✏️ Write Your Own" sub="Custom post with copy button" />
          <textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Write your post here... add your message, link, and hashtags"
            style={{ width: '100%', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#0a0a0a', outline: 'none', boxSizing: 'border-box', minHeight: '120px', resize: 'vertical', marginBottom: '0.75rem', fontFamily: 'system-ui, sans-serif' }}
          />
          <Pill
            label={customCopied ? '✅ Copied!' : '↗ Copy Post'}
            onClick={copyCustom}
            color={customCopied ? '#22c55e' : '#0070f3'}
          />
        </Card>

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: '0.78rem' }}>
          ⚡ ANTCPU ADS · 📸 Amanda Photography
        </div>

      </div>
    </div>
  );
}

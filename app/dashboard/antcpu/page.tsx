'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';

const TEAM = [
  { name: 'Antony Ciccone', email: 'antcpu@gmail.com', role: 'Founder & Admin', icon: '⚡' },
];

const POSTS = [
  { id: 1, text: 'ANTCPU ADS — The Arena is Live\n\nA competitive ad network where brands grow through real engagement, promo codes, and community sharing.\n\nFree 3-day trial. No credit card required.\n\n#antcpuads #marketing #buildinpublic #adtech #startup' },
  { id: 2, text: 'Why pay for ads that nobody sees?\n\nANTCPU ADS puts your brand in the Arena — where every click, share, and referral earns points and moves your ad up.\n\nStart free today.\n\n#antcpuads #marketing #growthhacking #startup #buildinpublic' },
  { id: 3, text: 'The $9.99 is not paying for ad performance.\n\nIt is paying for the brand building system.\n\nANTCPU ADS — quality built in from day one.\n\n#antcpuads #branding #marketing #buildinpublic #adtech' },
];

export default function AntcpuDashboard() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser]         = useState<any>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [custom, setCustom]     = useState('');
  const [customCopied, setCustomCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
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

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role="admin"
        userName={user.name} userEmail={user.email} userBrand={user.brand} trialStatus={user.trialStatus}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* HEADER */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0a0a0a' }}>⚡ ANTCPU</div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>Brand dashboard — post builder + content tools</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Pill label="🏠 Hub" onClick={() => router.push('/dashboard/user')} color="#0a0a0a" outline />
              <Pill label="📢 Create Ad" onClick={() => router.push('/create-ad')} color="#f0883e" />
              <Pill label="⚙️ Admin" onClick={() => router.push('/dashboard/admin')} color="#f0883e" outline />
            </div>
          </div>
        </Card>

        {/* TEAM */}
        <Card>
          <SectionHeader title="👥 Team" sub="ANTCPU brand members" />
          {TEAM.map(m => (
            <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0a0a0a' }}>{m.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{m.email} · {m.role}</div>
              </div>
              <span style={{ fontSize: '0.68rem', background: '#fff7ed', color: '#f0883e', border: '1px solid #fed7aa', borderRadius: '999px', padding: '0.15rem 0.6rem', fontWeight: 700 }}>✅ Admin</span>
            </div>
          ))}
        </Card>

        {/* POST BUILDER */}
        <Card>
          <SectionHeader title="📋 Ready-to-Post" sub="Copy and post to any platform — button turns green when copied" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {POSTS.map(p => (
              <div key={p.id} style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '1rem' }}>
                <pre style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem', color: '#333', whiteSpace: 'pre-wrap', margin: '0 0 0.75rem', lineHeight: 1.6 }}>{p.text}</pre>
                <Pill
                  label={copiedId === p.id ? '✅ Copied — safe to post' : '↗ Copy Post'}
                  onClick={() => copyPost(p.text, p.id)}
                  color={copiedId === p.id ? '#22c55e' : '#0070f3'}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* CUSTOM POST */}
        <Card>
          <SectionHeader title="✏️ Custom Post" sub="Write your own — copy when ready" />
          <textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Write your post here..."
            style={{ width: '100%', minHeight: '120px', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#0a0a0a', fontFamily: 'system-ui, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ marginTop: '0.75rem' }}>
            <Pill
              label={customCopied ? '✅ Copied — safe to post' : '↗ Copy Custom Post'}
              onClick={copyCustom}
              color={customCopied ? '#22c55e' : '#f0883e'}
            />
          </div>
        </Card>

        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: '0.78rem' }}>
          ⚡ ANTCPU ADS · <a href="mailto:antcpu@gmail.com" style={{ color: '#aaa' }}>antcpu@gmail.com</a>
        </div>

      </div>
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';
import ArenaFooter from '../../components/ArenaFooter';

const [piPrice, setPiPrice] = useState('...');

useEffect(() => {
  fetch('/pi-price')
    .then(r => r.json())
    .then(data => {
      const pi = data['pi-network']?.usd;
      if (pi) setPiPrice(`$${pi.toFixed(4)}`);
    }).catch(() => {});
}, []);

const TEAM = [
  { name: 'Philip Jennings',    email: 'joosdup.pj@gmail.com',     role: 'Founder & Project Manager', icon: '🗺️' },
  { name: 'Mohamed Elshoshani', email: 'melshoshani@gmail.com',    role: 'Marketing',                 icon: '📣' },
  { name: 'Andri Nael',         email: 'andri.postkast@gmail.com', role: 'Marketing',                 icon: '📣' },
];

const POSTS = [
  { id: 1,  tag: '🌅 Morning', text: 'Good morning ☀️\n\nPi Network is growing — and Map of Pi is where commerce happens.\n\n2.1M+ registered users. 148K sellers. 173K+ completed transactions.\n\nFind Pi sellers near you today 🗺️\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #picommerce #crypto' },
  { id: 2,  tag: '☀️ Noon',    text: 'The Pi economy is real 💛\n\nReal sellers. Real buyers. Real transactions happening right now on Map of Pi.\n\nLeave a review. Build trust. Grow the Pi community.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picommerce #blockchain #crypto' },
  { id: 3,  tag: '🌙 Evening', text: 'Pi Network is going mainstream 🌙\n\nMap of Pi is the largest Pi commerce platform in the world.\n\nJoin 2.1M+ users already building the Pi economy.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #crypto #picommerce' },
  { id: 4,  tag: '🗺️ Discovery', text: 'Did you know? 🗺️\n\nMap of Pi has 148K+ sellers listed worldwide.\n\nFind local Pi sellers, leave honest reviews, and help build a trusted Pi marketplace.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picommerce #sellers #crypto' },
  { id: 5,  tag: '📈 Growth',   text: '173,000+ completed Pi transactions 📈\n\nMap of Pi is not a concept — it is a working Pi commerce platform with real activity every day.\n\nJoin the movement.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #picommerce #growthhacking' },
  { id: 6,  tag: '🏆 Hackathon', text: '🏆 2024 Pi Commerce Hackathon Winner\n\nMap of Pi won the official Pi Network hackathon — recognized as the best Pi commerce platform in the ecosystem.\n\nBuilt by the community. For the community.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #hackathon #picommerce #crypto' },
  { id: 7,  tag: '🚀 Pi Price', text: `Pi is at ${piPrice} and climbing 🚀\n\nAs Pi value grows, so does the Map of Pi marketplace.\n\n148K sellers ready to transact. 2.1M+ users ready to buy.\n\nThe Pi economy is just getting started.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #crypto #picommerce` },
  { id: 8,  tag: '🌍 Global',    text: 'Pi commerce is global 🌍\n\nMap of Pi connects Pi buyers and sellers across every continent.\n\nNo borders. No banks. Just Pi.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #globalcommerce #crypto #picommerce' },
  { id: 9,  tag: '⭐ Reviews',   text: 'Trust is everything in Pi commerce ⭐\n\nMap of Pi lets buyers leave verified reviews — so the best sellers rise to the top.\n\nBuild your reputation. Grow your Pi business.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #reviews #picommerce #trust' },
  { id: 10, tag: '📱 Mobile',    text: 'Pi commerce in your pocket 📱\n\nMap of Pi works on any device. Find sellers, complete transactions, and leave reviews — all from your phone.\n\nThe future of Pi commerce is mobile.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #mobile #picommerce #crypto' },
];

export default function MapOfPiDashboard() {
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
      const allowed = ['antcpu@gmail.com', 'melshoshani@gmail.com', 'andri.postkast@gmail.com', 'joosdup.pj@gmail.com'];
      if (!allowed.includes(u.email)) { router.push('/dashboard/user'); return; }
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
        userName={user.name} userEmail={user.email} userBrand={user.brand} trialStatus={user.trialStatus}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* HEADER */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/brands/mapofpi/map-of-pi-logo.png" alt="Map of Pi" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2D6A4F' }} />
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0a0a0a' }}>🗺️ Map of Pi</div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>Brand dashboard — post builder + content tools</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Pill label="🏠 Hub" onClick={() => router.push('/dashboard/user')} color="#0a0a0a" outline />
              <Pill label="📢 Create Ad" onClick={() => router.push('/create-ad')} color="#2D6A4F" />
              <Pill label="🏟 Arena" onClick={() => router.push('/arena/mapofpi')} color="#2D6A4F" outline />
              <Pill label="🏆 Country Champion" onClick={() => router.push('/mapofpi')} color="#D4AF37" />
<Pill label="📋 Copy Champion Link" onClick={() => {
  navigator.clipboard.writeText('https://antcpu-ads.vercel.app/mapofpi?promo=MAPOFPI');
  setCopiedId(-1);
  setTimeout(() => setCopiedId(null), 2500);
}} color={copiedId === -1 ? '#22c55e' : '#D4AF37'} outline />

            </div>
          </div>
        </Card>

        {/* TEAM */}
        <Card>
          <SectionHeader title="👥 Team" sub="Map of Pi brand members" />
          {TEAM.map(m => (
            <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0a0a0a' }}>{m.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{m.email} · {m.role}</div>
              </div>
              <span style={{ fontSize: '0.68rem', background: '#f0faf4', color: '#2D6A4F', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '0.15rem 0.6rem', fontWeight: 700 }}>✅ Team</span>
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
                  color={copiedId === p.id ? '#22c55e' : '#2D6A4F'}
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
              color={customCopied ? '#22c55e' : '#2D6A4F'}
            />
          </div>
        </Card>

        <ArenaFooter accent="#2D6A4F" />

      </div>
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TIER_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  entry:    { color: '#0070f3', label: 'Entry',    icon: '📝' },
  rising:   { color: '#7928ca', label: 'Rising',   icon: '🖼' },
  featured: { color: '#ff0080', label: 'Featured', icon: '🎬' },
  toptier:  { color: '#f0883e', label: 'Top Tier', icon: '☁️' },
};

type Ad = {
  id: string; brand: string; title: string; url: string;
  description: string; category: string; status: string;
  tier: string; pinned: boolean; created_at: string; email: string; logo?: string;
};

type User = {
  name: string; email: string; brand: string; trialStatus: string;
};


// ── Sample Placeholder Ads ───────────────────────────────────
const SAMPLE_ADS = [
  {
    id: 'sample-1',
    brand: 'Map of Pi',
    title: 'Discover Pi Commerce Near You 🗺️',
    description: 'Find local sellers, leave reviews, and spend Pi in the real world. 2.1M+ users and growing.',
    url: 'https://mapofpi.com',
    tier: 'featured',
    pinned: true,
    category: 'Pi Commerce',
    status: 'active',
    email: 'mapofpi@antcpu.com',
    created_at: '',
  },
  {
    id: 'sample-2',
    brand: 'Amanda Photography',
    logo: 'https://antcpu.com/drive/stock/logo/amandaphotographylogo.png',
    title: 'Stories Through a Lens 📸',
    description: `A mother and grandmother capturing life's most beautiful moments. Family portraits, events, and memories.`,
    url: 'https://antcpu.com/manda',
    tier: 'entry',
    pinned: false,
    category: 'Photography',
    status: 'active',
    email: 'mishoemanda@gmail.com',
    created_at: '',
  },
  {
    id: 'sample-3',
    brand: 'Your Brand Here',
    title: 'This Could Be Your Ad ✨',
    description: 'Join the Arena. Launch your first ad in minutes. Free trial — no credit card required.',
    url: 'https://antcpu-ads.vercel.app',
    tier: 'entry',
    pinned: false,
    category: 'Promotion',
    status: 'active',
    email: '',
    created_at: '',
  },
];

// ── Onboarding Tracker ──────────────────────────────────────
function OnboardingTracker({ user, hasProfile, hasAd }: {
  user: User;
  hasProfile: boolean;
  hasAd: boolean;
}) {
  const allDone = hasProfile && hasAd;
  if (allDone) return null;

  const steps = [
    { icon: "✅", label: "You're in the Arena", desc: `Signed up as ${user.name}`, done: true },
    { icon: "👤", label: "Complete Your Profile", desc: "Add your bio and contact details", done: hasProfile, href: "/profile" },
    { icon: "📢", label: "Create Your First Ad", desc: "Build and launch your first ad", done: hasAd, href: "/create-ad" },
  ];

  const completed = steps.filter(s => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', position: 'relative' as const }}>
      <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: '2px', background: '#1a1a1a', borderRadius: '14px 14px 0 0' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#0070f3', borderRadius: '14px 14px 0 0', transition: 'width 0.4s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Setup Checklist</div>
        <div style={{ fontSize: '0.7rem', color: '#0070f3' }}>{completed}/{steps.length} complete</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.6rem' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: step.done ? 0.5 : 1 }}>
            <div style={{ fontSize: '1rem', minWidth: '1.5rem', textAlign: 'center' as const }}>{step.done ? '✅' : step.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: step.done ? '#555' : '#fff' }}>{step.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#444' }}>{step.desc}</div>
            </div>
            {!step.done && step.href && (
              <a href={step.href} style={{ fontSize: '0.75rem', color: '#0070f3', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' as const }}>Start →</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [myAds, setMyAds] = useState<Ad[]>([]);
  const [arenaAds, setArenaAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      fetchData(u.email);
    } catch { router.push('/'); }
    setHydrated(true);
  }, []);

  async function fetchData(email: string) {
    setLoading(true);
    const [{ data: mine }, { data: arena }] = await Promise.all([
      supabase.from('ads').select('*').eq('email', email).order('created_at', { ascending: false }),
      supabase.from('ads').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    setMyAds(mine || []);
    setArenaAds(arena || []);
    setLoading(false);
  }

  if (!hydrated) return null;
  if (!user) return null;

  const isTeam = user.trialStatus === 'team';
  const accentColor = isTeam ? '#7928ca' : '#0070f3';

  const LOCKED_FEATURES = [
    {
      tier: 'Rising',
      icon: '🖼',
      color: '#7928ca',
      title: 'Custom Image Ads',
      desc: 'Upload or generate a custom image for your ad. Powered by Photography API.',
      price: '$29/mo',
      cta: 'Upgrade to Rising',
    },
    {
      tier: 'Featured',
      icon: '🎬',
      color: '#ff0080',
      title: 'Video Ads + AI Agent',
      desc: 'Full ADS agent chat, 10 antbots, video ad creation powered by ANTCPU AI.',
      price: '$79/mo',
      cta: 'Upgrade to Featured',
    },
    {
      tier: 'Top Tier',
      icon: '☁️',
      color: '#f0883e',
      title: 'Cloud Campaign',
      desc: 'Full 10-antbot campaign managed by ANTCPU. antcpu.com/cloud integration.',
      price: 'Invite only',
      cta: 'Apply for Cloud',
    },
  ];

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>⚡ ANTCPU ADS</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.72rem', background: isTeam ? '#7928ca15' : '#0070f315', border: `1px solid ${isTeam ? '#7928ca40' : '#0070f340'}`, color: isTeam ? '#b388ff' : '#0070f3', borderRadius: '999px', padding: '0.25rem 0.85rem' }}>
            {isTeam ? '🔵 Team' : '🟢 Trial'} · Entry
          </span>
          <button onClick={() => router.push(`/profile/${encodeURIComponent(user.email)}`)}
            style={{ background: 'none', border: '1px solid #222', color: '#888', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.82rem' }}>
            👤 Profile
          </button>
          <button onClick={() => router.push('/create-ad')}
            style={{ background: accentColor, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
            + New Ad
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.3rem' }}>
            Welcome to the Arena, {user.name?.includes('@') ? user.brand || user.email.split('@')[0] : user.name?.split(' ')[0]} ⚡
          </h1>
          <p style={{ color: '#555', fontSize: '0.88rem' }}>
            {user.brand} · {isTeam ? '90-day team access' : '3-day free trial'} · Entry tier
          </p>
        </div>

        {/* My Ads */}
        <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Your Ads — {myAds.length} active
        </div>

        {myAds.length === 0 ? (
          <div style={{ background: '#111', border: `1px dashed ${accentColor}44`, borderRadius: '14px', padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📢</div>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No ads yet</div>
            <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Create your first ad and enter the Arena.</div>
            <button onClick={() => router.push('/create-ad')}
              style={{ background: accentColor, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.7rem 1.5rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
              Create Your First Ad →
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '2rem' }}>
            {myAds.map(ad => {
              const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
              return (
                <div key={ad.id} style={{ background: '#111', border: `1px solid ${tier.color}33`, borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: tier.color, borderRadius: '14px 14px 0 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', flex: 1, paddingRight: '1rem' }}>{ad.title}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}30`, borderRadius: '999px', padding: '0.2rem 0.6rem' }}>{tier.label.toUpperCase()}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: ad.status === 'active' ? '#3fb950' : '#d29922' }}>
                        {ad.status === 'active' ? '🟢 LIVE' : '🟡 REVIEW'}
                      </span>
                    </div>
                  </div>
                  <div style={{ color: '#666', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '0.6rem' }}>{ad.description}</div>
                  <a href={ad.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: tier.color, textDecoration: 'none', fontWeight: 600 }}>{ad.url} →</a>
                  <a href={`/profile/${encodeURIComponent(ad.email)}`} style={{ position: 'absolute', bottom: '0.75rem', right: '1rem', fontSize: '0.6rem', color: '#333', textDecoration: 'none', letterSpacing: '0.06em' }} title={`View ${ad.brand} profile`}>by {ad.brand} →</a>
                </div>
              );
            })}
          </div>
        )}

        {/* Arena Feed */}
        <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          The Arena — All Ads
        </div>

        {loading ? (
          <div style={{ color: '#333', fontSize: '0.85rem', padding: '1rem 0' }}>Loading arena...</div>
        ) : (
          <div style={{ marginBottom: '2.5rem' }}>
            {[...SAMPLE_ADS.filter(s => !arenaAds.find(a => a.email === s.email)), ...arenaAds].map(ad => {
              const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
              const isOwn = ad.email === user.email;
              return (
                <div key={ad.id} style={{
                  background: ad.tier === 'featured' ? '#130a0f' : ad.tier === 'toptier' ? '#0d0a06' : '#111',
                  border: ad.pinned ? '1px solid #D4AF3755' : ad.tier === 'featured' ? '1px solid #ff008044' : ad.tier === 'toptier' ? '1px solid #f0883e44' : isOwn ? `1px solid ${tier.color}33` : '1px solid #1a1a1a',
                  borderRadius: '14px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '0.75rem',
                  position: 'relative',
                  boxShadow: ad.tier === 'featured' ? '0 0 24px #ff008018' : ad.tier === 'toptier' ? '0 0 24px #f0883e18' : 'none',
                  borderLeft: ad.pinned ? '3px solid #D4AF37' : ad.tier === 'featured' ? '3px solid #ff0080' : ad.tier === 'toptier' ? '3px solid #f0883e' : '1px solid transparent',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: ad.tier === 'featured' ? 'linear-gradient(90deg, #ff0080, #7928ca)' : ad.tier === 'toptier' ? 'linear-gradient(90deg, #f0883e, #ff0080)' : tier.color, borderRadius: '14px 14px 0 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {ad.logo && <img src={ad.logo} alt={ad.brand} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />}
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{ad.brand}</div>
                      </div>
                      {ad.pinned && <span style={{ fontSize: '0.6rem', color: '#f0883e', background: '#f0883e15', border: '1px solid #f0883e30', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>📌 PINNED</span>}
                      {isOwn && <span style={{ fontSize: '0.6rem', color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}30`, borderRadius: '999px', padding: '0.1rem 0.5rem' }}>YOUR AD</span>}
                      {ad.id === 'sample-1' && <span style={{ fontSize: '0.6rem', color: '#D4AF37', background: '#D4AF3715', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>👑 #1</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {ad.category && <span style={{ fontSize: '0.6rem', color: '#444', background: '#1a1a1a', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>{ad.category}</span>}
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}30`, borderRadius: '999px', padding: '0.2rem 0.6rem' }}>{tier.label.toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>{ad.title}</div>
                  <div style={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '0.6rem' }}>{ad.description}</div>
                  <a href={ad.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: tier.color, textDecoration: 'none', fontWeight: 600 }}>{ad.url} →</a>
                  <a href={`/profile/${encodeURIComponent(ad.email)}`} style={{ position: 'absolute', bottom: '0.75rem', right: '1rem', fontSize: '0.6rem', color: '#333', textDecoration: 'none', letterSpacing: '0.06em' }} title={`View ${ad.brand} profile`}>by {ad.brand} →</a>
                </div>
              );
            })}
          </div>
        )}

        {/* Locked Features — Upsell */}
        <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Unlock More Power
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {LOCKED_FEATURES.map(f => (
            <div key={f.tier} style={{ background: '#111', border: `1px solid ${f.color}22`, borderRadius: '14px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* Lock overlay */}
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.7rem', color: '#333' }}>🔒</div>
              <div style={{ height: '2px', background: f.color, borderRadius: '2px', marginBottom: '1.25rem', opacity: 0.4 }} />
              <div style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: f.color, marginBottom: '0.3rem' }}>{f.tier}</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>{f.title}</div>
              <div style={{ color: '#555', fontSize: '0.78rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>{f.desc}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: f.color }}>{f.price}</span>
                <button
                  onClick={() => alert(`PayPal checkout for ${f.tier} coming soon!`)}
                  style={{ background: `${f.color}20`, border: `1px solid ${f.color}40`, color: f.color, borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                  {f.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Map of Pi sponsor */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #7928ca, #0070f3)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>🗺️ Free Trial Sponsor</span>
            <span style={{ fontSize: '0.7rem', background: '#7928ca15', border: '1px solid #7928ca40', borderRadius: '999px', padding: '0.2rem 0.75rem', color: '#b388ff' }}>🏆 2024 Pi Commerce Hackathon Winner</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.3rem' }}>Map of Pi</div>
          <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>Real people. Real reviews. Real Pi commerce. 2.1M+ users · 148K sellers</div>
          <a href="https://mapofpi.com" target="_blank" rel="noreferrer"
            style={{ background: '#0070f3', color: '#fff', padding: '0.55rem 1.25rem', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}>
            Visit Map of Pi →
          </a>
        </div>

        <div style={{ textAlign: 'center', color: '#2a2a2a', fontSize: '0.75rem' }}>
          ⚡ ANTCPU ADS · <a href="mailto:antcpu@gmail.com" style={{ color: '#2a2a2a' }}>antcpu@gmail.com</a>
        </div>

      </div>
    </div>
  );
}

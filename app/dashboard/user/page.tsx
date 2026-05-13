'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import AdminBar from '../../components/AdminBar';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TIER_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  entry:    { color: '#0070f3', label: 'Entry',    icon: '📝' },
  rising:   { color: '#7928ca', label: 'Rising',   icon: '🖼'  },
  featured: { color: '#ff0080', label: 'Featured', icon: '🎬' },
  toptier:  { color: '#f0883e', label: 'Top Tier', icon: '☁️' },
};

type Ad = {
  id: string; brand: string; title: string; url: string;
  description: string; category: string; status: string;
  tier: string; pinned: boolean; created_at: string; email: string; logo?: string;
};
type User = { name: string; email: string; brand: string; trialStatus: string; };

const SAMPLE_ADS = [
  { id: 'sample-1', brand: 'Map of Pi', title: 'Discover Pi Commerce Near You 🗺️', description: 'Find local sellers, leave reviews, and spend Pi in the real world. 2.1M+ users and growing.', url: 'https://mapofpi.com', tier: 'featured', pinned: true, category: 'Pi Commerce', status: 'active', email: 'mapofpi@antcpu.com', created_at: '' },
  { id: 'sample-2', brand: 'Amanda Photography', title: 'Stories Through a Lens 📸', description: "A mother and grandmother capturing life's most beautiful moments. Family portraits, events, and memories.", url: 'https://antcpu.com/manda', tier: 'entry', pinned: false, category: 'Photography', status: 'active', email: 'mishoemanda@gmail.com', created_at: '' },
  { id: 'sample-3', brand: 'Your Brand Here', title: 'This Could Be Your Ad ✨', description: 'Join the Arena. Launch your first ad in minutes. Free trial — no credit card required.', url: 'https://antcpu-ads.vercel.app', tier: 'entry', pinned: false, category: 'Promotion', status: 'active', email: '', created_at: '' },
];

function OnboardingTracker({ user, hasProfile, hasAd }: { user: User; hasProfile: boolean; hasAd: boolean }) {
  const router = useRouter();
  if (hasProfile && hasAd) return null;
  const steps = [
    { icon: '✅', label: "You're in the Arena", desc: `Signed up as ${user.name}`, done: true },
    { icon: '👤', label: 'Complete Your Profile', desc: 'Add your bio and contact details', done: hasProfile, href: '/profile' },
    { icon: '📢', label: 'Create Your First Ad', desc: 'Build and launch your first ad', done: hasAd, href: '/create-ad' },
  ];
  const completed = steps.filter(s => s.done).length;
  return (
    <Card>
      <SectionHeader title="⚡ Setup Checklist" sub={`${completed}/${steps.length} complete`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: step.done ? '#f0fdf4' : '#fafafa', borderRadius: '10px', border: `1px solid ${step.done ? '#bbf7d0' : '#e5e5e5'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{step.done ? '✅' : step.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0a0a0a' }}>{step.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{step.desc}</div>
              </div>
            </div>
            {!step.done && step.href && <Pill label="Start →" onClick={() => router.push(step.href!)} />}
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgentTeasers({ tier }: { tier: string }) {
  const agents = [
    { name: 'Aria',   icon: '🦋', task: 'Ad review',     unlocked: true },
    { name: 'Herald', icon: '📣', task: 'Announcements', unlocked: tier !== 'entry' },
    { name: 'Scout',  icon: '🔍', task: 'Analytics',     unlocked: false },
    { name: 'Forge',  icon: '⚙️', task: 'Ad builder',    unlocked: false },
    { name: 'Ledger', icon: '💰', task: 'Billing',       unlocked: false },
    { name: 'Vault',  icon: '🔒', task: 'Protection',    unlocked: false },
  ];
  return (
    <Card>
      <SectionHeader title="🤖 Your Agent Team" sub="Agents unlock as you upgrade" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
        {agents.map(a => (
          <div key={a.name} style={{ background: a.unlocked ? '#f0f7ff' : '#fafafa', border: `1px solid ${a.unlocked ? '#bfdbfe' : '#e5e5e5'}`, borderRadius: '10px', padding: '0.85rem', textAlign: 'center', opacity: a.unlocked ? 1 : 0.5 }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>{a.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0a0a0a' }}>{a.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#888' }}>{a.task}</div>
            {!a.unlocked && <div style={{ fontSize: '0.65rem', color: '#ccc', marginTop: '0.3rem' }}>🔒 upgrade</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [myAds, setMyAds] = useState<Ad[]>([]);
  const [arenaAds, setArenaAds] = useState<Ad[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    fetch('/api/doorbell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: '/dashboard/user', ref: document.referrer || 'direct', ts: new Date().toISOString(), ua: navigator.userAgent }) }).catch(() => {});
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      fetchData(u.email);
      supabase.from('ad_profiles').select('bio').eq('email', u.email.trim().toLowerCase()).maybeSingle().then(({ data }) => {
        if (data?.bio) setHasProfile(true);
      });
      supabase.from('ad_signups').select('promo_code').eq('email', u.email.trim().toLowerCase()).maybeSingle().then(({ data }) => {
        if (data?.promo_code) setReferralCode(data.promo_code);
        else setReferralCode(u.brand?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || '');
      });
    } catch { router.push('/'); }
    setHydrated(true);
  }, []);

  async function fetchData(email: string) {
    setLoading(true);
    const [{ data: mine }, { data: arena }, { data: signups }] = await Promise.all([
      supabase.from('ads').select('*').eq('email', email).order('created_at', { ascending: false }),
      supabase.from('ads').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('ad_signups').select('email, promo_code'),
    ]);
    const promoMap: Record<string, string> = {};
    (signups || []).forEach((s: any) => { if (s.promo_code) promoMap[s.email] = s.promo_code.toLowerCase(); });
    const enrich = (ads: any[]) => ads.map(a => ({ ...a, promo_code: promoMap[a.email] || null }));
    setMyAds(enrich(mine || []));
    setArenaAds(enrich(arena || []));
    setLoading(false);
  }

  if (!hydrated || !user) return null;

  const isAdmin = user.email === 'antcpu@gmail.com';
  const isTeam  = user.trialStatus === 'team';
  const accentColor = isAdmin ? '#f0883e' : isTeam ? '#7928ca' : '#0070f3';

  function shareAd(ad: Ad) {
    const categoryTags: Record<string, string> = {
      'Pi Commerce': '#mapofpi #pinetwork #picommerce #crypto',
      'Brand Awareness': '#branding #marketing #growthhacking #buildinpublic',
      'Product Launch': '#productlaunch #startup #newproduct #buildinpublic',
      'Photography': '#photography #portraits #memories #photographer',
      'Content Promotion': '#contentmarketing #creator #socialmedia #marketing',
      'Service Offering': '#smallbusiness #services #entrepreneur #marketing',
      'Event': '#event #community #networking #live',
      'Other': '#marketing #ads #business #antcpu',
    };
    const tags = categoryTags[ad.category] || '#marketing #ads #business #antcpu';
    const text = `Check out ${ad.brand} on ANTCPU ADS ⚡

"${ad.title}"

${ad.description}

→ ${ad.url}

${tags} #antcpuads`;
    navigator.clipboard.writeText(text).then(() => { setSharedId(ad.id); setTimeout(() => setSharedId(null), 2500); });
  }

  async function trackClick(ad: Ad) {
    if (ad.id.startsWith('sample-')) return;
    try {
      await Promise.all([
        supabase.from('ad_clicks').insert([{ ad_id: ad.id, email: user!.email, source: 'arena_feed' }]),
        supabase.from('ads').update({ click_count: (ad as any).click_count ? (ad as any).click_count + 1 : 1 }).eq('id', ad.id),
      ]);
    } catch (e) { console.warn('trackClick error:', e); }
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* ADMIN BAR */}
        {isAdmin && <AdminBar />}

        {/* WELCOME */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0a0a0a' }}>
                Welcome back, {user.name?.includes('@') ? user.brand || user.email.split('@')[0] : user.name?.split(' ')[0]} ⚡
              </div>
              <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.3rem' }}>
                {user.brand} · {isAdmin ? 'Admin — Full Access' : isTeam ? 'Team — Unlimited Access' : '3-day free trial'} · Entry tier
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Pill label="📢 Create Ad" onClick={() => router.push('/create-ad')} color={accentColor} />
              <Pill label="👤 Profile"   onClick={() => router.push('/profile')}    color={accentColor} outline />
            </div>
          </div>
        </Card>

        {/* ONBOARDING */}
        <OnboardingTracker user={user} hasProfile={hasProfile} hasAd={myAds.length > 0} />

        {/* REFERRAL */}
        {referralCode && (
          <Card>
            <SectionHeader title="⚡ Your Referral Code" sub="Earn 10pts per trial signup · 50pts when they go paid" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 800, color: '#0a0a0a', background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.5rem 1.25rem' }}>{referralCode}</div>
              <Pill
                label={referralCopied ? '✓ Copied!' : '↗ Copy Link'}
                onClick={() => { navigator.clipboard.writeText(`https://antcpu-ads.vercel.app/login?ref=${referralCode}`); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); }}
                color={referralCopied ? '#22c55e' : accentColor}
              />
            </div>
          </Card>
        )}

        {/* MY ADS */}
        <Card>
          <SectionHeader title="📢 My Ads" sub={`${myAds.length} active`} />
          {myAds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📢</div>
              <div style={{ fontWeight: 700, color: '#0a0a0a', marginBottom: '0.3rem' }}>No ads yet</div>
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>Create your first ad and enter the Arena.</div>
              <Pill label="Create Your First Ad →" onClick={() => router.push('/create-ad')} color={accentColor} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myAds.map(ad => {
                const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
                return (
                  <div key={ad.id} style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderLeft: `3px solid ${tier.color}`, borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0a0a0a' }}>{ad.title}</span>
                      <span style={{ background: tier.color, color: '#fff', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.65rem', fontWeight: 700 }}>{tier.label}</span>
                      <span style={{ background: ad.status === 'active' ? '#dcfce7' : '#fef9c3', color: ad.status === 'active' ? '#16a34a' : '#ca8a04', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.65rem', fontWeight: 700 }}>{ad.status === 'active' ? '🟢 LIVE' : '🟡 REVIEW'}</span>
                      {(ad as any).points > 0 && <span style={{ fontSize: '0.7rem', color: '#f0883e' }}>⚡ {(ad as any).points}pts</span>}
                      {(ad as any).click_count > 0 && <span style={{ fontSize: '0.7rem', color: '#888' }}>👆 {(ad as any).click_count}</span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.75rem' }}>{ad.description}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Pill label="↗ Share" onClick={() => shareAd(ad)} color={sharedId === ad.id ? '#22c55e' : '#555'} outline />
                      {(ad as any).promo_code && <Pill label="🏠 Arena" onClick={() => router.push(`/arena/${(ad as any).promo_code.toLowerCase()}`)} color={tier.color} outline />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ARENA FEED */}
        <Card>
          <SectionHeader title="🏟 The Arena" sub="All active ads in the network" />
          {loading ? (
            <div style={{ color: '#888', fontSize: '0.85rem', padding: '1rem 0' }}>Loading arena...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...SAMPLE_ADS.filter(s => !arenaAds.find(a => a.email === s.email)), ...arenaAds].map(ad => {
                const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
                const isOwn = ad.email === user.email;
                return (
                  <div key={ad.id} onClick={() => trackClick(ad)} style={{ background: '#fafafa', border: `1px solid ${ad.pinned ? '#f0883e40' : '#e5e5e5'}`, borderLeft: `3px solid ${tier.color}`, borderRadius: '10px', padding: '1rem', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0a0a0a' }}>{ad.brand}</span>
                      {ad.pinned && <span style={{ background: '#fff7ed', color: '#f0883e', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.62rem', fontWeight: 700 }}>📌 PINNED</span>}
                      {isOwn && <span style={{ background: '#eff6ff', color: '#0070f3', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.62rem', fontWeight: 700 }}>YOUR AD</span>}
                      <span style={{ background: tier.color + '20', color: tier.color, borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.62rem', fontWeight: 700 }}>{tier.label}</span>
                      {ad.category && <span style={{ fontSize: '0.68rem', color: '#888' }}>{ad.category}</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0a0a0a', marginBottom: '0.3rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.75rem' }}>{ad.description}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Pill label="Visit →" onClick={() => window.open(ad.url, '_blank')} color={tier.color} />
                      <Pill label={sharedId === ad.id ? '✓ Copied' : '↗ Share'} onClick={() => { shareAd(ad); }} color={sharedId === ad.id ? '#22c55e' : '#555'} outline />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* AGENTS */}
        <AgentTeasers tier={myAds[0]?.tier || 'entry'} />

        {/* UPGRADE */}
        <Card>
          <SectionHeader title="🚀 Unlock More Power" sub="Upgrade to access Pro and Deluxe features" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { tier: 'Pro', icon: '🖼', color: '#7928ca', title: 'Image Ads + Pro Arena', desc: 'Upload custom images. Access the Pro Arena feed.', price: '$27.99/mo' },
              { tier: 'Deluxe', icon: '🎬', color: '#ff0080', title: 'Video Ads + Both Arenas', desc: 'Video ads featured in Main + Pro Arena.', price: '$79.99/mo' },
            ].map(f => (
              <div key={f.tier} style={{ background: '#fafafa', border: `1px solid ${f.color}30`, borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: f.color, marginBottom: '0.25rem' }}>{f.tier} — {f.price}</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0a0a0a', marginBottom: '0.3rem' }}>{f.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '1rem' }}>{f.desc}</div>
                <Pill label={`🔒 Unlock ${f.tier}`} onClick={() => alert(`${f.tier} plan coming soon!`)} color={f.color} />
              </div>
            ))}
          </div>
        </Card>

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: '0.78rem' }}>
          ⚡ ANTCPU ADS · <a href="mailto:antcpu@gmail.com" style={{ color: '#aaa' }}>antcpu@gmail.com</a>
        </div>

      </div>
    </div>
  );
}

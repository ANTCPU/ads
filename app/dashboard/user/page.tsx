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

const TIER_CONFIG: Record<string, { color: string; label: string }> = {
  entry:    { color: '#0070f3', label: 'Entry' },
  rising:   { color: '#7928ca', label: 'Rising' },
  featured: { color: '#ff0080', label: 'Featured' },
  toptier:  { color: '#f0883e', label: 'Top Tier' },
};

const SAMPLE_ADS = [
  { id: 'sample-1', brand: 'Map of Pi',          title: 'Discover Pi Commerce Near You 🗺️',  description: 'Find local sellers, leave reviews, and spend Pi in the real world. 2.1M+ users and growing.', url: 'https://mapofpi.com',           tier: 'featured', pinned: true,  category: 'Pi Commerce',  status: 'active', email: 'mapofpi@antcpu.com',      promo_code: 'mapofpi' },
  { id: 'sample-2', brand: 'Amanda Photography', title: 'Stories Through a Lens 📸',          description: "A mother and grandmother capturing life's most beautiful moments. Family portraits, events, and memories.", url: 'https://antcpu.com/manda', tier: 'entry',    pinned: false, category: 'Photography',  status: 'active', email: 'mishoemanda@gmail.com',    promo_code: 'amanda' },
  { id: 'sample-3', brand: 'Your Brand Here',    title: 'This Could Be Your Ad ✨',           description: 'Join the Arena. Launch your first ad in minutes. Free trial — no credit card required.',           url: 'https://antcpu-ads.vercel.app', tier: 'entry',    pinned: false, category: 'Promotion',    status: 'active', email: '',                         promo_code: null },
];

type Ad = { id: string; brand: string; title: string; url: string; description: string; category: string; status: string; tier: string; pinned: boolean; email: string; promo_code?: string | null; click_count?: number; points?: number; };
type User = { name: string; email: string; brand: string; trialStatus: string; };

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser]               = useState<User | null>(null);
  const [myAd, setMyAd]               = useState<Ad | null>(null);
  const [arenaAds, setArenaAds]       = useState<Ad[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  const [adCopied, setAdCopied]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [hydrated, setHydrated]       = useState(false);
  const [sharedId, setSharedId]       = useState<string | null>(null);
  const [hasProfile, setHasProfile]   = useState(false);

  useEffect(() => {
    fetch('/api/doorbell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: '/dashboard/user', ref: document.referrer || 'direct', ts: new Date().toISOString(), ua: navigator.userAgent }) }).catch(() => {});
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      fetchData(u.email);
      supabase.from('ad_profiles').select('bio').eq('email', u.email.trim().toLowerCase()).maybeSingle().then(({ data }) => { if (data?.bio) setHasProfile(true); });
      supabase.from('ad_signups').select('promo_code').eq('email', u.email.trim().toLowerCase()).maybeSingle().then(({ data }) => {
        setReferralCode(data?.promo_code || u.brand?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || '');
      });
    } catch { router.push('/'); }
    setHydrated(true);
  }, []);

  async function fetchData(email: string) {
    setLoading(true);
    const [{ data: mine }, { data: arena }, { data: signups }] = await Promise.all([
      supabase.from('ads').select('*').eq('email', email).eq('status', 'active').order('created_at', { ascending: false }).limit(1),
      supabase.from('ads').select('*').eq('status', 'active').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('ad_signups').select('email, promo_code'),
    ]);
    const promoMap: Record<string, string> = {};
    (signups || []).forEach((s: any) => { if (s.promo_code) promoMap[s.email] = s.promo_code.toLowerCase(); });
    const enrich = (ads: any[]) => ads.map(a => ({ ...a, promo_code: promoMap[a.email] || null }));
    setMyAd(enrich(mine || []).length > 0 ? enrich(mine || [])[0] : null);
    setArenaAds(enrich(arena || []));
    setLoading(false);
  }

  async function trackClick(ad: Ad) {
    if (ad.id.startsWith('sample-')) return;
    try {
      await Promise.all([
        supabase.from('ad_clicks').insert([{ ad_id: ad.id, email: user!.email, source: 'arena_feed' }]),
        supabase.from('ads').update({ click_count: (ad.click_count || 0) + 1 }).eq('id', ad.id),
      ]);
    } catch {}
  }

  function shareAd(ad: Ad) {
    const categoryTags: Record<string, string> = {
      'Pi Commerce': '#mapofpi #pinetwork #picommerce #crypto',
      'Photography': '#photography #portraits #memories #photographer',
      'Brand Awareness': '#branding #marketing #growthhacking',
      'Product Launch': '#productlaunch #startup #newproduct',
      'Other': '#marketing #ads #business #antcpu',
    };
    const tags = categoryTags[ad.category] || '#marketing #ads #antcpu';
    const text = `Check out ${ad.brand} on ANTCPU ADS ⚡\n\n"${ad.title}"\n\n${ad.description}\n\n→ ${ad.url}\n\n${tags} #antcpuads`;
    navigator.clipboard.writeText(text).then(() => { setSharedId(ad.id); setTimeout(() => setSharedId(null), 2500); });
  }

  function copyMyAd() {
    if (!myAd) return;
    shareAd(myAd);
    setAdCopied(true);
    setTimeout(() => setAdCopied(false), 2500);
  }

  if (!hydrated || !user) return null;

  const isAdmin  = user.email === 'antcpu@gmail.com';
  const isTeam   = user.trialStatus === 'team';
  const accent   = isAdmin ? '#f0883e' : isTeam ? '#7928ca' : '#0070f3';
  const firstName = user.name?.includes('@') ? user.brand || user.email.split('@')[0] : user.name?.split(' ')[0];
  const showOnboarding = !hasProfile || !myAd;

  const feedAds = [...SAMPLE_ADS.filter(s => !arenaAds.find(a => a.email === s.email)), ...arenaAds];

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'}
        userName={user.name} userEmail={user.email} userBrand={user.brand} trialStatus={user.trialStatus as any}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* WELCOME */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0a0a0a' }}>Welcome back, {firstName} ⚡</div>
              <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.25rem' }}>{user.brand} · {isAdmin ? 'Admin' : isTeam ? 'Team — Unlimited' : '3-day trial'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Pill label={myAd ? '✏️ Edit Ad' : '📢 Create Ad'} onClick={() => router.push('/create-ad')} color={accent} />
              <Pill label="👤 Profile" onClick={() => router.push('/profile')} color={accent} outline />
            </div>
          </div>
        </Card>

        {/* ONBOARDING — only if incomplete */}
        {showOnboarding && (
          <Card>
            <SectionHeader title="🚀 Getting Started" sub="Complete these steps to go live" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: "You're in the Arena", desc: `Signed up as ${user.name}`, done: true },
                { label: 'Complete Your Profile', desc: 'Add your bio and contact details', done: hasProfile, href: '/profile' },
                { label: 'Create Your First Ad', desc: 'Build and launch your first ad', done: !!myAd, href: '/create-ad' },
              ].map((step, i) => (
                <div key={i} onClick={() => step.href && !step.done && router.push(step.href)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: step.done ? '#f0fdf4' : '#fafafa', border: `1px solid ${step.done ? '#bbf7d0' : '#e5e5e5'}`, borderRadius: '10px', cursor: step.href && !step.done ? 'pointer' : 'default' }}>
                  <span style={{ fontSize: '1.1rem' }}>{step.done ? '✅' : '⭕'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0a0a0a' }}>{step.label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{step.desc}</div>
                  </div>
                  {!step.done && step.href && <span style={{ fontSize: '0.75rem', color: accent, fontWeight: 700 }}>→</span>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* MY ACTIVE AD */}
        <Card>
          <SectionHeader title="📢 My Active Ad" sub="1 ad active in Phase 1" />
          {!myAd ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0a0a0a', marginBottom: '0.25rem' }}>No active ad yet</div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>Create your first ad and enter the Arena.</div>
              <Pill label="📢 Create Your Ad →" onClick={() => router.push('/create-ad')} color={accent} />
            </div>
          ) : (
            <div style={{ background: '#fafafa', border: `1px solid ${TIER_CONFIG[myAd.tier]?.color}30`, borderLeft: `3px solid ${TIER_CONFIG[myAd.tier]?.color}`, borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0a0a0a' }}>{myAd.title}</span>
                <span style={{ fontSize: '0.68rem', background: `${TIER_CONFIG[myAd.tier]?.color}15`, color: TIER_CONFIG[myAd.tier]?.color, border: `1px solid ${TIER_CONFIG[myAd.tier]?.color}30`, borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 700 }}>{TIER_CONFIG[myAd.tier]?.label}</span>
                <span style={{ fontSize: '0.68rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 700 }}>🟢 LIVE</span>
                {(myAd.click_count || 0) > 0 && <span style={{ fontSize: '0.68rem', color: '#888' }}>👆 {myAd.click_count} clicks</span>}
                {(myAd.points || 0) > 0 && <span style={{ fontSize: '0.68rem', color: '#f0883e' }}>⚡ {myAd.points} pts</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.75rem', lineHeight: 1.6 }}>{myAd.description}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Pill label={adCopied ? '✅ Copied!' : '↗ Share My Ad'} onClick={copyMyAd} color={adCopied ? '#22c55e' : accent} />
                {myAd.promo_code && <Pill label="🏟 My Arena" onClick={() => router.push(`/arena/${myAd.promo_code}`)} color={accent} outline />}
                <Pill label="✏️ Edit" onClick={() => router.push('/create-ad')} color="#888" outline />
              </div>
            </div>
          )}
        </Card>

        {/* REFERRAL CODE */}
        {referralCode && (
          <Card>
            <SectionHeader title="🔗 Your Promo Code" sub="Share this to earn points and climb the Arena" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.6rem 1.25rem', fontWeight: 800, fontSize: '1rem', color: accent, letterSpacing: '0.08em' }}>{referralCode}</div>
              <Pill
                label={referralCopied ? '✅ Copied!' : '↗ Copy Link'}
                onClick={() => { navigator.clipboard.writeText(`https://antcpu-ads.vercel.app/login?ref=${referralCode}`); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); }}
                color={referralCopied ? '#22c55e' : accent}
              />
            </div>
          </Card>
        )}

        {/* ARENA FEED */}
        <Card>
          <SectionHeader title="🏟 The Arena" sub="All active ads — click to visit, share to earn" />
          {loading ? (
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Loading arena...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {feedAds.map(ad => {
                const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
                const isOwn = ad.email === user.email;
                return (
                  <div key={ad.id} onClick={() => trackClick(ad)} style={{ background: '#fafafa', border: `1px solid ${ad.pinned ? '#f0883e40' : '#e5e5e5'}`, borderLeft: `3px solid ${tier.color}`, borderRadius: '10px', padding: '1rem', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0a0a0a' }}>{ad.brand}</span>
                      {ad.pinned && <span style={{ fontSize: '0.65rem', color: '#f0883e', fontWeight: 700 }}>📌 PINNED</span>}
                      {isOwn  && <span style={{ fontSize: '0.65rem', color: accent, fontWeight: 700 }}>YOUR AD</span>}
                      <span style={{ fontSize: '0.65rem', background: `${tier.color}15`, color: tier.color, border: `1px solid ${tier.color}30`, borderRadius: '999px', padding: '0.1rem 0.45rem', fontWeight: 700 }}>{tier.label}</span>
                      {ad.category && <span style={{ fontSize: '0.65rem', color: '#888', background: '#f0f0f0', borderRadius: '999px', padding: '0.1rem 0.45rem' }}>{ad.category}</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0a0a0a', marginBottom: '0.3rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem', lineHeight: 1.6 }}>{ad.description}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Pill label={`→ ${ad.url.replace(/https?:\/\//, '').slice(0, 28)}`} onClick={() => window.open(ad.url, '_blank')} color={tier.color} />
                      <Pill label={sharedId === ad.id ? '✅ Copied' : '↗ Share'} onClick={() => { shareAd(ad); }} color={sharedId === ad.id ? '#22c55e' : '#888'} outline />
                    </div>
                  </div>
                );
              })}
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

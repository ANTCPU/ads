'use client';
// app/profile/[slug]/page.tsx
// ─── Public + Owner + Super profile — unified surface ────────────────────────
//
// LAYER 1 — visitor:   bio, active ads, badges, pills (guide state for locked)
// LAYER 2 — owner:     + edit profile, loyalty card, all ad statuses, ad controls
// LAYER 3 — super:     + view-as toggle, admin panel, tier override, badge award
//
// GAP FIXES:
//   L-01  decodeURIComponent on slug — handles email with @ and .
//   C-06  role read from localStorage correctly
//   M-02  ad status tabs — active / pending / archived
//   M-03  owner ad controls — edit title/desc/url, archive, restore
//   M-04  LoyaltyCard wired for owner
//   M-05  reaction_count in Ad type + stats
//   L-04  badge pill contrast — uses badge tier colour not #ffffff15
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect }  from 'react';
import { useParams, useRouter }        from 'next/navigation';
import { createClient }                from '@supabase/supabase-js';
import ArenaNav                        from '../../components/ArenaNav';
import ArenaFooter                     from '../../components/ArenaFooter';
import LoyaltyCard                     from '../../components/LoyaltyCard';
import { clearSessionCookie }          from '../../lib/session';
import { tokens, inp as baseInp }      from '../../lib/shopAdStyles';
import { setStoredLocale }             from '../../lib/locale';
import { BADGE_REGISTRY }              from '../../lib/badges';
import { MEMBERSHIP_TIERS,
         MembershipTier,
         getTierDef }                  from '../../lib/membership';
import { resolveFlag, buildFlagMap }   from '../../lib/flags';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'admin' | 'owner' | 'public';

type Viewer = {
  email: string; name: string; brand: string;
  trialStatus: string; role: string;
};

type ProfileForm = {
  bio: string; contact: string; website: string; facebook: string;
  twitter: string; tiktok: string; youtube: string; instagram: string;
  linkedin: string; discord: string; telegram: string;
  antcoin_wallet: string; preferred_locale: string;
};

type Ad = {
  id: string; brand: string; title: string; url: string;
  description: string; category: string; status: string;
  tier: string; pinned: boolean; email: string;
  click_count: number; share_count: number; like_count: number;
  boost_count: number; reaction_count: number; points: number;
  rank_position?: number; image_url?: string | null;
  is_country_champion?: boolean; country?: string;
};

type UserBadge  = { badge_slug: string; awarded_at: string };
type SignupRow  = {
  membership_tier: MembershipTier; points: number; streak_days: number;
  trial_extended_at: string | null; created_at: string | null;
  trialStatus: string;
};

// ─── Pill registry ────────────────────────────────────────────────────────────

type PillState = 'active' | 'guide' | 'soon';

type ProfilePill = {
  id:        string;
  label:     string;
  icon:      string;
  href:      string;
  guidePath: string;
  minTier:   MembershipTier;
  flagId:    string | null;
};

const TIER_ORDER: MembershipTier[] = [
  'trial', 'member', 'rising', 'veteran', 'champion', 'subscriber',
];

const PROFILE_PILLS: ProfilePill[] = [
  { id: 'arena',        label: 'Arena',        icon: '🏟',  href: '/arena',        guidePath: '/guide#arena',        minTier: 'trial',      flagId: null                   },
  { id: 'create-ad',    label: 'Create Ad',    icon: '📢',  href: '/create-ad',    guidePath: '/guide#create-ad',    minTier: 'trial',      flagId: 'module-create-ad'     },
  { id: 'campaign-hub', label: 'Campaign Hub', icon: '🗺️',  href: '/campaign-hub', guidePath: '/guide#campaign-hub', minTier: 'rising',     flagId: 'module-campaign-hub'  },
  { id: 'posts',        label: 'Posts',        icon: '📝',  href: '/posts',        guidePath: '/guide#posts',        minTier: 'veteran',    flagId: 'module-posts'         },
  { id: 'aria-chat',    label: 'Aria Chat',    icon: '💬',  href: '/antbots/chat', guidePath: '/guide#aria-chat',    minTier: 'veteran',    flagId: 'module-chat'          },
  { id: 'video-feed',   label: 'Video Feed',   icon: '🎥',  href: '/video',        guidePath: '/guide#video-feed',   minTier: 'subscriber', flagId: 'module-video-feed'    },
];

function getPillState(
  pill:           ProfilePill,
  membershipTier: MembershipTier,
  flagMap:        Record<string, boolean>,
  isSuper:        boolean,
): PillState {
  if (isSuper) return 'active';
  const tierIdx    = TIER_ORDER.indexOf(membershipTier);
  const minIdx     = TIER_ORDER.indexOf(pill.minTier);
  const tierOk     = tierIdx >= minIdx;
  const flagOk     = pill.flagId ? resolveFlag(pill.flagId, flagMap) : true;
  if (tierOk && flagOk)  return 'active';
  if (tierOk && !flagOk) return 'soon';
  return 'guide';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOCIAL_DOMAINS: Record<string, string> = {
  website: '', twitter: 'x.com', instagram: 'instagram.com',
  facebook: 'facebook.com', tiktok: 'tiktok.com', youtube: 'youtube.com',
  linkedin: 'linkedin.com', discord: 'discord.com', telegram: 'telegram.org',
  antcoin_wallet: 'antcpu-ads.vercel.app',
};

const SOCIALS: { key: keyof ProfileForm; label: string; placeholder: string }[] = [
  { key: 'website',        label: 'Website',        placeholder: 'https://yoursite.com'                },
  { key: 'twitter',        label: 'Twitter / X',    placeholder: 'https://twitter.com/yourhandle'      },
  { key: 'instagram',      label: 'Instagram',      placeholder: 'https://instagram.com/yourhandle'    },
  { key: 'facebook',       label: 'Facebook',       placeholder: 'https://facebook.com/yourpage'       },
  { key: 'tiktok',         label: 'TikTok',         placeholder: 'https://tiktok.com/@yourhandle'      },
  { key: 'youtube',        label: 'YouTube',        placeholder: 'https://youtube.com/@yourchannel'    },
  { key: 'linkedin',       label: 'LinkedIn',       placeholder: 'https://linkedin.com/in/yourprofile' },
  { key: 'discord',        label: 'Discord',        placeholder: 'https://discord.gg/yourserver'       },
  { key: 'telegram',       label: 'Telegram',       placeholder: 'https://t.me/yourhandle'             },
  { key: 'antcoin_wallet', label: 'Antcoin Wallet', placeholder: 'wallet@antcoin.store'                },
];

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English'   },
  { code: 'ar', label: 'AR', name: 'العربية'   },
  { code: 'zh', label: 'ZH', name: '中文'       },
  { code: 'es', label: 'ES', name: 'Español'   },
  { code: 'hi', label: 'HI', name: 'हिन्दी'    },
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'fr', label: 'FR', name: 'Français'  },
  { code: 'it', label: 'IT', name: 'Italiano'  },
];

const EMPTY_FORM: ProfileForm = {
  bio: '', contact: '', website: '', facebook: '', twitter: '',
  tiktok: '', youtube: '', instagram: '', linkedin: '', discord: '',
  telegram: '', antcoin_wallet: '', preferred_locale: 'en',
};

const TIER_COLOR: Record<string, string> = {
  entry: '#0070f3', rising: '#7928ca', featured: '#ff0080', top_tier: '#f0883e',
};

// ─── Tokens ───────────────────────────────────────────────────────────────────

const bg     = tokens.bg;
const card   = tokens.card;
const border = tokens.border;
const muted  = '#555';
const white  = '#fff';
const gold   = '#D4AF37';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FavIcon({ url, socialKey }: { url: string; socialKey: string }) {
  const domain = socialKey === 'website'
    ? (() => { try { return new URL(url).hostname; } catch { return 'globe'; } })()
    : SOCIAL_DOMAINS[socialKey];
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      width={16} height={16} style={{ borderRadius: 3 }} alt=""
    />
  );
}

const ARENA_FALLBACK_VIDEO = 'KuSW1xT8jmo';

function getYouTubeEmbedUrl(url: string): string {
  if (url) {
    const watchId = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1];
    if (watchId) return `https://www.youtube.com/embed/${watchId}?autoplay=0&rel=0`;
    const handle = url.match(/@([\w-]+)/)?.[1];
    if (handle) return `https://www.youtube.com/embed?listType=user_uploads&list=${handle}&autoplay=0`;
    const channelId = url.match(/channel\/([\w-]+)/)?.[1];
    if (channelId) return `https://www.youtube.com/embed?listType=user_uploads&list=${channelId}&autoplay=0`;
  }
  return `https://www.youtube.com/embed/${ARENA_FALLBACK_VIDEO}?autoplay=0&rel=0`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();

  // ── L-01 fix: decodeURIComponent handles @ and . in email slugs ───────────
  const slug         = params?.slug as string || '';
  const profileEmail = (() => {
    try { return decodeURIComponent(slug).toLowerCase().trim(); }
    catch { return slug.toLowerCase().trim(); }
  })();

  // ── Viewer ────────────────────────────────────────────────────────────────
  const [viewer,   setViewer]   = useState<Viewer | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const [hydrated, setHydrated] = useState(false);

  // ── Profile data ──────────────────────────────────────────────────────────
  const [form,       setForm]       = useState<ProfileForm>(EMPTY_FORM);
  const [origForm,   setOrigForm]   = useState<ProfileForm>(EMPTY_FORM);
  const [hasProfile, setHasProfile] = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  // ── Signup / loyalty ──────────────────────────────────────────────────────
  const [signupRow,  setSignupRow]  = useState<SignupRow | null>(null);
  const [loyaltyRestarting, setLoyaltyRestarting] = useState(false);
  const [trialExtendedAt,   setTrialExtendedAt]   = useState<string | null>(null);

  // ── Badges ────────────────────────────────────────────────────────────────
  const [badges, setBadges] = useState<UserBadge[]>([]);

  // ── Ads ───────────────────────────────────────────────────────────────────
  const [ads,       setAds]       = useState<Ad[]>([]);
  const [adsTab,    setAdsTab]    = useState<'active' | 'pending' | 'archived'>('active');
  const [editingAd, setEditingAd] = useState<string | null>(null);
  const [adEditForm, setAdEditForm] = useState({ title: '', description: '', url: '' });
  const [adSaving,  setAdSaving]  = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  // ── Flags ─────────────────────────────────────────────────────────────────
  const [flagMap, setFlagMap] = useState<Record<string, boolean>>({});

  // ── Admin panel ───────────────────────────────────────────────────────────
  const [awardingBadge,  setAwardingBadge]  = useState('');
  const [awardingResult, setAwardingResult] = useState('');
  const [overrideTier,   setOverrideTier]   = useState<MembershipTier | ''>('');
  const [overrideResult, setOverrideResult] = useState('');

  // ── Boot ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!profileEmail) return;

    // Read viewer from localStorage — C-06 fix: role is read correctly
    const stored = localStorage.getItem('arena_user');
    let v: Viewer | null = null;
    if (stored) {
      try { v = JSON.parse(stored); setViewer(v); } catch {}
    }

    const isSuper = v?.role === 'super' || (!!SUPER_EMAIL && v?.email === SUPER_EMAIL);
    const isOwner = v?.email?.toLowerCase().trim() === profileEmail;

    // Default viewMode
    if (isSuper) setViewMode('admin');
    else if (isOwner) setViewMode('owner');
    else setViewMode('public');

    // Parallel data fetch
    Promise.all([
      // Profile
      supabase.from('ad_profiles').select('*')
        .eq('email', profileEmail).maybeSingle(),
      // Signup row — loyalty + tier
      supabase.from('ad_signups')
        .select('membership_tier, points, streak_days, trial_extended_at, created_at, trialStatus')
        .eq('email', profileEmail).maybeSingle(),
      // Badges
      supabase.from('user_badges')
        .select('badge_slug, awarded_at')
        .eq('user_email', profileEmail)
        .order('awarded_at', { ascending: false }),
      // Ads — owner/super sees all statuses, visitor sees active only
      isOwner || isSuper
        ? supabase.from('ads').select('*').eq('email', profileEmail)
            .order('created_at', { ascending: false })
        : supabase.from('ads').select('*').eq('email', profileEmail)
            .eq('status', 'active')
            .order('points', { ascending: false }),
      // Flags
      fetch('/api/flags').then(r => r.json()).catch(() => ({ flags: [] })),
    ]).then(([profileRes, signupRes, badgesRes, adsRes, flagsJson]) => {

      // Profile form
      if (profileRes.data) {
        const keys   = Object.keys(EMPTY_FORM) as (keyof ProfileForm)[];
        const loaded = Object.fromEntries(
          keys.map(k => [k, profileRes.data[k] || (k === 'preferred_locale' ? 'en' : '')])
        ) as ProfileForm;
        setForm(loaded);
        setOrigForm(loaded);
        if (profileRes.data.bio) setHasProfile(true);
      } else if (isOwner) {
        setEditing(true);
      }

      // Signup row
      if (signupRes.data) {
        setSignupRow(signupRes.data as SignupRow);
        if (signupRes.data.trial_extended_at) setTrialExtendedAt(signupRes.data.trial_extended_at);
      }

      // Badges
      if (badgesRes.data) setBadges(badgesRes.data);

      // Ads
      if (adsRes.data) setAds(adsRes.data);

      // Flags
      setFlagMap(buildFlagMap(flagsJson.flags || []));

      setHydrated(true);
    });
  }, [profileEmail]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const isSuper        = viewer?.role === 'super' || (!!SUPER_EMAIL && viewer?.email === SUPER_EMAIL);
  const isOwner        = viewer?.email?.toLowerCase().trim() === profileEmail;
  const effectiveOwner = isOwner || (isSuper && viewMode !== 'public');
  const effectiveAdmin = isSuper && viewMode === 'admin';

  const membershipTier = (signupRow?.membership_tier || 'trial') as MembershipTier;
  const tierDef        = getTierDef(membershipTier);
  const dbPoints       = signupRow?.points || 0;

  const knownBadges = badges.filter(b => BADGE_REGISTRY.find(r => r.slug === b.badge_slug));

  const activeAds   = ads.filter(a => a.status === 'active');
  const pendingAds  = ads.filter(a => a.status === 'pending_review');
  const archivedAds = ads.filter(a => a.status === 'archived');

  const visibleAds  = effectiveOwner
    ? (adsTab === 'active' ? activeAds : adsTab === 'pending' ? pendingAds : archivedAds)
    : activeAds;

  const totalClicks    = activeAds.reduce((s, a) => s + (a.click_count    || 0), 0);
  const totalShares    = activeAds.reduce((s, a) => s + (a.share_count    || 0), 0);
  const totalReactions = activeAds.reduce((s, a) => s + (a.reaction_count || 0), 0);

  const isDirty = JSON.stringify(form) !== JSON.stringify(origForm);

  const accent = isSuper ? '#f0883e'
    : viewer?.trialStatus === 'team' ? '#7928ca'
    : '#0070f3';

  // ── Profile save ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!viewer) return;
    setSaving(true);
    await supabase.from('ad_profiles').upsert(
      [{ email: profileEmail, name: viewer.name, brand: viewer.brand, ...form }],
      { onConflict: 'email' }
    );
    localStorage.setItem('arena_profile', JSON.stringify(form));
    setStoredLocale(form.preferred_locale as any);
    if (isDirty) {
      fetch('/api/discord-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          event: 'general',
          embed: {
            title: '👤 Profile Saved',
            color: 0x0070f3,
            fields: [
              { name: 'Name',  value: viewer.name,  inline: true },
              { name: 'Brand', value: viewer.brand, inline: true },
              { name: 'Email', value: viewer.email, inline: false },
              ...(form.bio ? [{ name: 'Bio', value: form.bio.slice(0, 80), inline: false }] : []),
            ],
            timestamp: true,
          },
        }),
      }).catch(() => {});
    }
    setOrigForm(form);
    setSaving(false);
    setSaved(true);
    setHasProfile(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Loyalty restart ───────────────────────────────────────────────────────

  async function handleLoyaltyRestart() {
    if (!viewer || loyaltyRestarting) return;
    setLoyaltyRestarting(true);
    try {
      const res  = await fetch('/api/loyalty/restart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profileEmail }),
      });
      const data = await res.json();
      if (data.ok && data.extended) setTrialExtendedAt(new Date().toISOString());
    } catch {}
    setLoyaltyRestarting(false);
  }

  // ── Ad controls ───────────────────────────────────────────────────────────

  function openAdEdit(ad: Ad) {
    setEditingAd(ad.id);
    setAdEditForm({ title: ad.title, description: ad.description, url: ad.url });
    setConfirmArchive(null);
  }

  async function saveAdEdit(id: string) {
    setAdSaving(true);
    await supabase.from('ads').update({
      title:       adEditForm.title.trim(),
      description: adEditForm.description.trim(),
      url:         adEditForm.url.trim(),
    }).eq('id', id);
    setAds(prev => prev.map(a => a.id === id ? { ...a, ...adEditForm } : a));
    setEditingAd(null);
    setAdSaving(false);
  }

  async function archiveAd(id: string) {
    await supabase.from('ads').update({ status: 'archived', pinned: false }).eq('id', id);
    setAds(prev => prev.map(a => a.id === id ? { ...a, status: 'archived', pinned: false } : a));
    setConfirmArchive(null);
  }

  async function restoreAd(id: string) {
    await supabase.from('ads').update({ status: 'active' }).eq('id', id);
    fetch('/api/scout/score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: id }),
    }).catch(() => {});
    setAds(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a));
  }

  // ── Admin panel handlers ──────────────────────────────────────────────────

  async function handleAwardBadge() {
    if (!awardingBadge) return;
    setAwardingResult('…');
    const res  = await fetch('/api/badges/award', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: profileEmail, badge_slug: awardingBadge }),
    });
    const data = await res.json();
    setAwardingResult(data.ok ? '✅ Awarded' : `❌ ${data.error || 'Failed'}`);
    if (data.ok) {
      setBadges(prev => [...prev, { badge_slug: awardingBadge, awarded_at: new Date().toISOString() }]);
    }
    setTimeout(() => setAwardingResult(''), 3000);
  }

  async function handleOverrideTier() {
    if (!overrideTier) return;
    setOverrideResult('…');
    const { error } = await supabase.from('ad_signups')
      .update({ membership_tier: overrideTier })
      .eq('email', profileEmail);
    setOverrideResult(error ? `❌ ${error.message}` : '✅ Updated');
    if (!error) setSignupRow(prev => prev ? { ...prev, membership_tier: overrideTier } : prev);
    setTimeout(() => setOverrideResult(''), 3000);
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!hydrated) return null;

  // ── Styles ────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: card, border: `1px solid ${border}`,
    borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem',
  };
  const lbl: React.CSSProperties = {
    fontSize: '0.68rem', color: muted, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem',
  };
  const inp: React.CSSProperties = {
    ...baseInp, background: bg, marginBottom: '0.75rem',
    fontSize: '0.88rem', padding: '0.65rem 0.85rem',
  };
  const rowBtn = (color: string, disabled = false): React.CSSProperties => ({
    background: 'transparent', border: `1px solid ${disabled ? border : color}`,
    borderRadius: '8px', color: disabled ? muted : color,
    fontSize: '0.72rem', fontWeight: 700, padding: '0.35rem 0.65rem',
    cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
  });

  // ── Render ────────────────────────────────────────────────────────────────

  const profileName  = form.bio ? viewer?.name || profileEmail.split('@')[0] : profileEmail.split('@')[0];
  const profileBrand = viewer?.brand || '';

  return (
    <div style={{ background: bg, minHeight: '100vh', color: white, fontFamily: 'system-ui, sans-serif' }}>

      <ArenaNav
        role={(viewer?.role as any) || 'user'}
        userName={viewer?.name || ''}
        userEmail={viewer?.email || ''}
        userBrand={viewer?.brand || ''}
        trialStatus={(viewer?.trialStatus as any) || 'trial'}
        onLogout={async () => { await clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* ── Back ── */}
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.78rem', padding: 0, marginBottom: '1.5rem' }}>
          ← Back
        </button>

        {/* ── VIEW-AS TOGGLE — super only ── */}
        {isSuper && (
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', background: card, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.5rem' }}>
            {(['admin', 'owner', 'public'] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                flex: 1, background: viewMode === mode ? accent : 'transparent',
                border: `1px solid ${viewMode === mode ? accent : border}`,
                borderRadius: '7px', color: viewMode === mode ? '#000' : muted,
                fontWeight: 700, fontSize: '0.72rem', padding: '0.4rem 0',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {mode === 'admin' ? '⚡ Admin' : mode === 'owner' ? '👤 Owner' : '👁 Public'}
              </button>
            ))}
          </div>
        )}

        {/* ── HEADER ── */}
        <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${accent}, transparent)` }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: white, marginBottom: '0.2rem' }}>
                {form.bio ? profileName : profileEmail.split('@')[0]}
              </div>
              <div style={{ fontSize: '0.78rem', color: muted, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {profileBrand && <span style={{ color: accent, fontWeight: 700 }}>{profileBrand}</span>}
                {profileBrand && <span>·</span>}
                <span style={{
                  background: `${tierDef.color}15`, border: `1px solid ${tierDef.color}40`,
                  color: tierDef.color, borderRadius: '999px', padding: '0.1rem 0.5rem',
                  fontSize: '0.65rem', fontWeight: 700,
                }}>
                  {tierDef.icon} {tierDef.label}
                </span>
                {knownBadges.some(b => b.badge_slug === 'country-champion') && (
                  <span style={{ background: `${gold}15`, border: `1px solid ${gold}40`, color: gold, borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.65rem', fontWeight: 700 }
                }}>
                  🏆 Champion
                </span>
              )}
            </div>
          </div>

          {/* ── Stats row ── */}
          {activeAds.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {[
                { label: 'Points',    value: dbPoints,       color: accent },
                { label: 'Clicks',    value: totalClicks,    color: '#0070f3' },
                { label: 'Shares',    value: totalShares,    color: '#7928ca' },
                { label: 'Reactions', value: totalReactions, color: '#f0883e' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.6rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Feature pills ── */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {PROFILE_PILLS.map(pill => {
              const state = getPillState(pill, membershipTier, flagMap, isSuper);
              const dest  = state === 'active' ? pill.href
                          : state === 'guide'  ? pill.guidePath
                          : null;
              const pillAccent = state === 'active' ? accent
                               : state === 'soon'   ? muted
                               : '#333';
              return (
                <button
                  key={pill.id}
                  onClick={() => dest && router.push(dest)}
                  title={
                    state === 'guide' ? `Unlock at ${pill.minTier} tier — tap to learn how`
                    : state === 'soon' ? 'Coming soon'
                    : pill.label
                  }
                  style={{
                    background:    state === 'active' ? `${accent}15` : 'transparent',
                    border:        `1px ${state === 'guide' ? 'dashed' : 'solid'} ${pillAccent}`,
                    borderRadius:  '999px',
                    color:         state === 'active' ? accent : state === 'soon' ? '#333' : '#444',
                    fontSize:      '0.72rem',
                    fontWeight:    700,
                    padding:       '0.3rem 0.75rem',
                    cursor:        state === 'soon' ? 'default' : 'pointer',
                    opacity:       state === 'soon' ? 0.5 : 1,
                    transition:    'all 0.15s',
                    display:       'flex',
                    alignItems:    'center',
                    gap:           '0.3rem',
                  }}
                >
                  <span>{pill.icon}</span>
                  <span>{pill.label}</span>
                  {state === 'guide' && <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>→</span>}
                  {state === 'soon'  && <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>soon</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── BADGES ── */}
        {knownBadges.length > 0 && (
          <div style={cardStyle}>
            <div style={lbl}>Badges</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {knownBadges.map(b => {
                const def      = BADGE_REGISTRY.find(r => r.slug === b.badge_slug)!;
                const defColor = def.tier === 4 ? gold
                               : def.tier === 3 ? '#22c55e'
                               : def.tier === 2 ? '#0070f3'
                               : '#7928ca';
                return (
                  <div
                    key={b.badge_slug}
                    title={def.desc}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      background:   `${defColor}12`,
                      border:       `1px solid ${defColor}35`,
                      borderRadius: '999px',
                      padding:      '0.25rem 0.65rem',
                      cursor:       'default',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>{def.icon}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: defColor }}>
                      {def.label}
                    </span>
                    {def.tier === 4 && (
                      <span style={{ fontSize: '0.6rem', color: gold, opacity: 0.7 }}>✦</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BIO — view mode ── */}
        {hasProfile && !editing && (
          <>
            <div style={cardStyle}>
              <div style={lbl}>About</div>
              <div style={{ fontSize: '0.88rem', color: '#aaa', lineHeight: 1.6, marginBottom: form.contact ? '0.75rem' : 0 }}>
                {form.bio || '—'}
              </div>
              {form.contact && (
                <div style={{ fontSize: '0.82rem', color: muted, marginTop: '0.5rem' }}>
                  📧 {form.contact}
                </div>
              )}
              {form.preferred_locale !== 'en' && (
                <div style={{ fontSize: '0.78rem', color: muted, marginTop: '0.5rem' }}>
                  🤖 Agent language: <strong style={{ color: accent }}>
                    {LANGUAGES.find(l => l.code === form.preferred_locale)?.name || 'English'}
                  </strong>
                </div>
              )}
            </div>

            {/* ── Video ── */}
            <div style={cardStyle}>
              <div style={lbl}>▶ {form.youtube ? 'YouTube' : 'Arena Video'}</div>
              <iframe
                src={getYouTubeEmbedUrl(form.youtube || '')}
                width="100%" height="200"
                style={{ borderRadius: '10px', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen
              />
            </div>

            {/* ── Links ── */}
            {SOCIALS.some(s => form[s.key]) && (
              <div style={cardStyle}>
                <div style={lbl}>Links</div>
                {SOCIALS.filter(s => form[s.key]).map(s => (
                  <a key={s.key}
                    href={(form[s.key] as string).startsWith('http') ? form[s.key] as string : `https://${form[s.key]}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: `1px solid ${border}`, color: '#aaa', textDecoration: 'none', fontSize: '0.82rem' }}>
                    <FavIcon url={form[s.key] as string} socialKey={s.key} />
                    <span style={{ fontWeight: 600 }}>{s.label}</span>
                    <span style={{ color: muted, fontSize: '0.72rem', marginLeft: 'auto' }}>→</span>
                  </a>
                ))}
              </div>
            )}

            {/* ── Edit button — owner only ── */}
            {effectiveOwner && (
              <button
                onClick={() => setEditing(true)}
                style={{ width: '100%', background: accent, border: 'none', color: '#fff', borderRadius: '10px', padding: '0.85rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1rem' }}>
                ✏️ Edit Profile
              </button>
            )}
          </>
        )}

        {/* ── BIO — edit mode ── */}
        {editing && effectiveOwner && (
          <>
            <div style={cardStyle}>
              <div style={lbl}>Bio</div>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell the Arena who you are..."
                rows={4}
                style={{ ...inp, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
              />
              <div style={lbl}>Contact Email</div>
              <input
                value={form.contact}
                onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                placeholder="hello@yourbrand.com"
                style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={cardStyle}>
              <div style={lbl}>🤖 Agent Language</div>
              <div style={{ fontSize: '0.78rem', color: muted, marginBottom: '0.75rem' }}>
                Aria and your antbots will write in this language.
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => setForm(f => ({ ...f, preferred_locale: l.code }))} style={{
                    background:   form.preferred_locale === l.code ? accent : 'transparent',
                    border:       `1px solid ${form.preferred_locale === l.code ? accent : '#333'}`,
                    color:        form.preferred_locale === l.code ? '#fff' : muted,
                    borderRadius: '8px', padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={lbl}>Links & Socials</div>
              {SOCIALS.map(s => (
                <div key={s.key}>
                  <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {form[s.key] && <FavIcon url={form[s.key] as string} socialKey={s.key} />}
                    {s.label}
                  </div>
                  <input
                    value={form[s.key] as string}
                    onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                    placeholder={s.placeholder}
                    style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 1, background: saved ? '#22c55e' : accent, border: 'none', color: '#fff', borderRadius: '10px', padding: '0.85rem', fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : saved ? '✅ Saved' : 'Save Profile'}
              </button>
              {hasProfile && (
                <button
                  onClick={() => setEditing(false)}
                  style={{ background: 'transparent', border: `1px solid ${border}`, color: muted, borderRadius: '10px', padding: '0.85rem 1.25rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </>
        )}

        {/* ── LOYALTY CARD — owner only ── */}
        {effectiveOwner && signupRow && (
          <LoyaltyCard
            status={signupRow.trialStatus || viewer?.trialStatus || 'trial'}
            createdAt={signupRow.created_at}
            points={dbPoints}
            trialExtendedAt={trialExtendedAt}
            restarting={loyaltyRestarting}
            onRestart={handleLoyaltyRestart}
            onUpgrade={() => router.push('/?upgrade=1')}
          />
        )}

        {/* ── ADS ── */}
        {(effectiveOwner ? ads.length > 0 : activeAds.length > 0) && (
          <div style={cardStyle}>

            {/* Tab bar — owner sees all statuses */}
            {effectiveOwner ? (
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                {([
                  { key: 'active',   label: `Active (${activeAds.length})`   },
                  { key: 'pending',  label: `Pending (${pendingAds.length})`  },
                  { key: 'archived', label: `Archived (${archivedAds.length})` },
                ] as { key: typeof adsTab; label: string }[]).map(t => (
                  <button key={t.key} onClick={() => setAdsTab(t.key)} style={{
                    background:   adsTab === t.key ? accent : 'transparent',
                    border:       `1px solid ${adsTab === t.key ? accent : border}`,
                    borderRadius: '8px', color: adsTab === t.key ? '#000' : muted,
                    fontSize: '0.72rem', fontWeight: 700, padding: '0.35rem 0.75rem',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={lbl}>Ads</div>
            )}

            {/* Ad list */}
            {visibleAds.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: muted, padding: '0.5rem 0' }}>
                No {adsTab} ads.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {visibleAds.map(ad => {
                  const tierColor  = TIER_COLOR[ad.tier] || '#0070f3';
                  const isEditing  = editingAd === ad.id;
                  const isConfirm  = confirmArchive === ad.id;
                  // M-05 fix: reaction_count in stats
                  return (
                    <div key={ad.id} style={{
                      background: bg, border: `1px solid ${border}`,
                      borderLeft: `3px solid ${tierColor}`,
                      borderRadius: '10px', padding: '1rem',
                    }}>
                      {/* Ad header */}
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: white }}>{ad.title}</span>
                        <span style={{ fontSize: '0.62rem', color: tierColor, fontWeight: 700, textTransform: 'uppercase' }}>{ad.tier}</span>
                        {ad.pinned && <span style={{ fontSize: '0.62rem', color: accent, fontWeight: 700 }}>⭐ Featured</span>}
                        {ad.is_country_champion && ad.country && (
                          <span style={{ fontSize: '0.62rem', color: gold, fontWeight: 700 }}>🏆 {ad.country}</span>
                        )}
                        {ad.rank_position && ad.rank_position <= 3 && (
                          <span>{ad.rank_position === 1 ? '🥇' : ad.rank_position === 2 ? '🥈' : '🥉'}</span>
                        )}
                      </div>

                      {/* Description */}
                      {!isEditing && (
                        <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                          {ad.description.length > 100
                            ? ad.description.slice(0, ad.description.lastIndexOf(' ', 100)) + '…'
                            : ad.description}
                        </div>
                      )}

                      {/* Stats — M-05 fix: reaction_count included */}
                      <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.7rem', color: muted, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        {(ad.click_count    || 0) > 0 && <span>👆 {ad.click_count}</span>}
                        {(ad.share_count    || 0) > 0 && <span>↗ {ad.share_count}</span>}
                        {(ad.like_count     || 0) > 0 && <span>😊 {ad.like_count}</span>}
                        {(ad.boost_count    || 0) > 0 && <span style={{ color: gold }}>⚡ ×{ad.boost_count}</span>}
                        {(ad.reaction_count || 0) > 0 && <span>🔥 {ad.reaction_count}</span>}
                        {(ad.points         || 0) > 0 && <span style={{ color: tierColor }}>⚡ {ad.points} pts</span>}
                      </div>

                      {/* Inline edit form */}
                      {isEditing && (
                        <div style={{ marginBottom: '0.65rem' }}>
                          <input
                            value={adEditForm.title}
                            onChange={e => setAdEditForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Title"
                            style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
                          />
                          <textarea
                            value={adEditForm.description}
                            onChange={e => setAdEditForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Description"
                            rows={3}
                            style={{ ...inp, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                          />
                          <input
                            value={adEditForm.url}
                            onChange={e => setAdEditForm(f => ({ ...f, url: e.target.value }))}
                            placeholder="URL"
                            style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 0 }}
                          />
                        </div>
                      )}

                      {/* Archive confirm */}
                      {isConfirm && (
                        <div style={{ background: '#1a0e00', border: `1px solid #f0883e30`, borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.65rem', fontSize: '0.78rem', color: '#f0883e' }}>
                          Archive this ad? It will leave the Arena feed.
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {/* Visit — always shown */}
                        {!isEditing && ad.url && (
                          <button
                            onClick={() => window.open(ad.url, '_blank', 'noopener,noreferrer')}
                            style={rowBtn(tierColor)}>
                            Visit →
                          </button>
                        )}

                        {/* Owner controls — M-03 fix */}
                        {effectiveOwner && !isEditing && !isConfirm && ad.status === 'active' && (
                          <>
                            <button onClick={() => openAdEdit(ad)}           style={rowBtn('#0070f3')}>✏️ Edit</button>
                            <button onClick={() => setConfirmArchive(ad.id)} style={rowBtn('#f0883e')}>📦 Archive</button>
                          </>
                        )}
                        {effectiveOwner && !isEditing && !isConfirm && ad.status === 'archived' && (
                          <button onClick={() => restoreAd(ad.id)} style={rowBtn('#22c55e')}>↩ Restore</button>
                        )}
                        {effectiveOwner && !isEditing && !isConfirm && ad.status === 'pending_review' && (
                          <span style={{ fontSize: '0.72rem', color: '#f0883e', fontWeight: 700 }}>⏳ Pending review</span>
                        )}

                        {/* Edit save/cancel */}
                        {isEditing && (
                          <>
                            <button onClick={() => saveAdEdit(ad.id)} disabled={adSaving} style={rowBtn('#22c55e', adSaving)}>
                              {adSaving ? '…' : '💾 Save'}
                            </button>
                            <button onClick={() => setEditingAd(null)} style={rowBtn(muted)}>✕ Cancel</button>
                          </>
                        )}

                        {/* Archive confirm/cancel */}
                        {isConfirm && (
                          <>
                            <button onClick={() => archiveAd(ad.id)} style={rowBtn('#ef4444')}>📦 Confirm</button>
                            <button onClick={() => setConfirmArchive(null)} style={rowBtn(muted)}>✕ Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN PANEL — super only ── */}
        {effectiveAdmin && (
          <div style={{ ...cardStyle, border: `1px solid ${accent}30` }}>
            <div style={{ position: 'absolute' }} />
            <div style={lbl}>⚡ Admin Panel — {profileEmail}</div>

            {/* Tier override */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '0.4rem', fontWeight: 700 }}>
                Override Membership Tier
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {MEMBERSHIP_TIERS.map(t => (
                  <button key={t.key} onClick={() => setOverrideTier(t.key as MembershipTier)} style={{
                    background:   overrideTier === t.key ? t.color : 'transparent',
                    border:       `1px solid ${overrideTier === t.key ? t.color : border}`,
                    borderRadius: '8px', color: overrideTier === t.key ? '#000' : muted,
                    fontSize: '0.68rem', fontWeight: 700, padding: '0.3rem 0.65rem',
                    cursor: 'pointer',
                  }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={handleOverrideTier} disabled={!overrideTier} style={rowBtn(accent, !overrideTier)}>
                  Apply Tier
                </button>
                {overrideResult && <span style={{ fontSize: '0.78rem', color: overrideResult.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{overrideResult}</span>}
              </div>
            </div>

            {/* Badge award */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '0.4rem', fontWeight: 700 }}>
                Award Badge
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {BADGE_REGISTRY.map(b => (
                  <button key={b.slug} onClick={() => setAwardingBadge(b.slug)} style={{
                    background:   awardingBadge === b.slug ? `${gold}20` : 'transparent',
                    border:       `1px solid ${awardingBadge === b.slug ? gold : border}`,
                    borderRadius: '999px', color: awardingBadge === b.slug ? gold : muted,
                    fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.55rem',
                    cursor: 'pointer',
                  }}>
                    {b.icon} {b.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={handleAwardBadge} disabled={!awardingBadge} style={rowBtn(gold, !awardingBadge)}>
                  Award Badge
                </button>
                {awardingResult && <span style={{ fontSize: '0.78rem', color: awardingResult.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{awardingResult}</span>}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: `1px solid ${border}` }}>
              <button onClick={() => router.push('/dashboard/antcpu')} style={rowBtn(accent)}>⚡ Command Centre</button>
              <button onClick={() => router.push('/dashboard/users')}  style={rowBtn('#0070f3')}>👥 Users</button>
              <button onClick={() => router.push('/arena')}            style={rowBtn(muted)}>🏟 Arena</button>
            </div>
          </div>
        )}

        {/* ── PUBLIC PROFILE LINK — owner only ── */}
        {effectiveOwner && (
          <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={lbl}>Public Profile URL</div>
              <div style={{ fontSize: '0.75rem', color: muted }}>
                antcpu-ads.vercel.app/profile/{slug}
              </div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(`https://antcpu-ads.vercel.app/profile/${slug}`)}
              style={rowBtn(accent)}>
              📋 Copy
            </button>
          </div>
        )}

      </div>

      <ArenaFooter />
    </div>
  );
}

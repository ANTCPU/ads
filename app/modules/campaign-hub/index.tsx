'use client';
// app/modules/campaign-hub/index.tsx
// ─── Campaign Hub — real marketing tool ───────────────────────────────────────
//
// The central hub for how ads are tracked, managed, and shared.
//
// USER VIEW — tabs: My Campaign · Share · Book a Session
//   My Campaign:
//     — Live ad card: title, tier, points, rank
//     — Tier progress bar with next milestone
//     — This week: clicks, shares, reactions, boosts
//     — Engagement trend: simple 7-day bar chart
//     — Next action nudge: what to do to climb
//   Share:
//     — Pre-written copy for 4 platforms
//     — One-tap copy to clipboard per platform
//     — Direct share URL
//   Book a Session:
//     — Day + time picker → bookings table + Discord webhook
//     — User's existing bookings with status
//
// ADMIN VIEW — tabs: Network · Bookings
//   Network:
//     — Tier groups with engagement totals
//     — Expandable per-ad management (pin, tier, rescore)
//     — Pending review queue
//     — Stalling ads (high points, low recent engagement)
//   Bookings:
//     — Pending queue with confirm/decline
//     — All bookings list
//
// Absorbs: schedule module (booking logic fully migrated here)
//
// v2 (Sep 2026) — full rewrite from passive tier list to real marketing hub
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { ModuleContext, Ad }                 from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_WINDOWS = [
  '9:00 AM – 10:00 AM',
  '10:00 AM – 11:00 AM',
  '11:00 AM – 12:00 PM',
  '1:00 PM – 2:00 PM',
  '2:00 PM – 3:00 PM',
  '3:00 PM – 4:00 PM',
  '4:00 PM – 5:00 PM',
];

const BOOKING_WEBHOOK = process.env.NEXT_PUBLIC_DISCORD_BOOKING_WEBHOOK || '';

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  top_tier: '#f0883e',
  featured: '#ff0080',
  rising:   '#7928ca',
  entry:    '#0070f3',
};

const TIER_LABEL: Record<string, string> = {
  top_tier: 'Top Tier',
  featured: 'Featured',
  rising:   'Rising',
  entry:    'Entry',
};

const TIER_NEXT: Record<string, { label: string; pts: number } | null> = {
  entry:    { label: 'Rising',   pts: 50  },
  rising:   { label: 'Featured', pts: 150 },
  featured: { label: 'Top Tier', pts: 300 },
  top_tier: null,
};

const TIERS = ['top_tier', 'featured', 'rising', 'entry'];

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:      '#0a0a0a',
  card:    '#111',
  card2:   '#0d0d0d',
  border:  '#1a1a1a',
  border2: '#222',
  orange:  '#f0883e',
  gold:    '#D4AF37',
  green:   '#22c55e',
  blue:    '#0070f3',
  red:     '#ef4444',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
  sub:     '#888',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type TierGroup = {
  tier:        string;
  count:       number;
  totalPoints: number;
  totalClicks: number;
  totalShares: number;
  totalReactions: number;
};

type DayBar = {
  day:    string;
  clicks: number;
  shares: number;
  points: number;
};

type Booking = {
  id:          string;
  email:       string;
  name:        string;
  brand:       string;
  day:         string;
  time_window: string;
  note:        string;
  status:      string;
  created_at:  string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: string): string {
  if (s === 'confirmed') return C.green;
  if (s === 'declined')  return C.red;
  return C.orange;
}

function copyToClipboard(text: string, setCopied: (k: string) => void, key: string) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }).catch(() => {});
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignHubModule({
  slug, supabase, user, isSuper,
}: ModuleContext) {

  // ── Shared state ──────────────────────────────────────────────────────────
  const [ads,      setAds]      = useState<Ad[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // ── User tab state ────────────────────────────────────────────────────────
  const [userTab,      setUserTab]      = useState<'campaign' | 'share' | 'book'>('campaign');
  const [dayBars,      setDayBars]      = useState<DayBar[]>([]);
  const [copied,       setCopied]       = useState('');
  const [selectedDay,  setSelectedDay]  = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [note,         setNote]         = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [bookings,     setBookings]     = useState<Booking[]>([]);

  // ── Admin tab state ───────────────────────────────────────────────────────
  const [adminTab,  setAdminTab]  = useState<'network' | 'bookings'>('network');
  const [groups,    setGroups]    = useState<TierGroup[]>([]);
  const [total,     setTotal]     = useState(0);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const today = new Date().getDay();

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const brandName = user.brand || slug;

    const [adsRes, bookingsRes] = await Promise.all([
      supabase
        .from('ads')
        .select('*')
        .ilike('brand', `%${brandName}%`)
        .eq('status', 'active')
        .order('points', { ascending: false }),
      isSuper
        ? supabase.from('bookings').select('*').order('created_at', { ascending: false })
        : supabase.from('bookings').select('*').eq('email', user.email).order('created_at', { ascending: false }),
    ]);

    const adData = adsRes.data || [];
    setAds(adData);
    setBookings(bookingsRes.data || []);

    // ── Tier groups (admin) ───────────────────────────────────────────────
    const map: Record<string, TierGroup> = {};
    adData.forEach((ad: Ad) => {
      const t = ad.tier || 'entry';
      if (!map[t]) map[t] = { tier: t, count: 0, totalPoints: 0, totalClicks: 0, totalShares: 0, totalReactions: 0 };
      map[t].count++;
      map[t].totalPoints    += ad.points         || 0;
      map[t].totalClicks    += ad.click_count    || 0;
      map[t].totalShares    += ad.share_count    || 0;
      map[t].totalReactions += ad.reaction_count || 0;
    });
    setGroups(TIERS.filter(t => map[t]).map(t => map[t]));
    setTotal(adData.length);

    // ── 7-day engagement bars (user) ──────────────────────────────────────
    const bars: DayBar[] = DAYS.map(day => ({ day, clicks: 0, shares: 0, points: 0 }));
    adData.forEach((ad: Ad) => {
      if (!ad.click_count && !ad.share_count && !ad.points) return;
      // distribute evenly across days as a proxy (no per-day tracking yet)
      // when per-day tracking lands, replace with real data
      const d = new Date().getDay();
      bars[d].clicks += ad.click_count || 0;
      bars[d].shares += ad.share_count || 0;
      bars[d].points += ad.points      || 0;
    });
    setDayBars(bars);

    setLoading(false);
  }, [slug, user.brand, user.email, isSuper, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Admin actions ─────────────────────────────────────────────────────────
  async function approveAd(adId: string) {
    setUpdating(adId);
    await supabase.from('ads').update({ status: 'active' }).eq('id', adId);
    fetch('/api/scout/score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: adId }),
    }).catch(() => {});
    await fetchData();
    setUpdating(null);
  }

  async function rejectAd(adId: string) {
    setUpdating(adId);
    await supabase.from('ads').update({ status: 'rejected' }).eq('id', adId);
    setAds(prev => prev.filter(a => a.id !== adId));
    setUpdating(null);
  }

  async function togglePin(ad: Ad) {
    setUpdating(ad.id);
    await supabase.from('ads').update({ pinned: !ad.pinned }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, pinned: !a.pinned } : a));
    setUpdating(null);
  }

  async function updateTier(adId: string, tier: string) {
    setUpdating(adId);
    await supabase.from('ads').update({ tier }).eq('id', adId);
    await fetchData();
    setUpdating(null);
  }

  async function updateBookingStatus(id: string, status: string) {
    setUpdating(id);
    await supabase.from('bookings').update({ status }).eq('id', id);
    if (status === 'confirmed' && BOOKING_WEBHOOK) {
      const b = bookings.find(x => x.id === id);
      if (b) {
        fetch(BOOKING_WEBHOOK, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [{ title: '✅ Booking Confirmed', color: 0x22c55e,
            description: `**${b.name}** — confirmed.`,
            fields: [{ name: '📅', value: b.day, inline: true }, { name: '🕐', value: b.time_window, inline: true }],
            footer: { text: 'ANTCPU ADS · Campaign Hub' }, timestamp: new Date().toISOString(),
          }] }),
        }).catch(() => {});
      }
    }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    setUpdating(null);
  }

  // ── Book a session ────────────────────────────────────────────────────────
  async function submitBooking() {
    if (!selectedDay || !selectedTime || !user.email) return;
    setSubmitting(true);
    await supabase.from('bookings').insert([{
      email:       user.email,
      name:        user.name  || user.email,
      brand:       user.brand || slug,
      day:         selectedDay,
      time_window: selectedTime,
      note:        note.trim(),
      status:      'pending',
    }]);
    if (BOOKING_WEBHOOK) {
      fetch(BOOKING_WEBHOOK, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [{ title: '📅 New Booking Request', color: 0xf0883e,
          fields: [
            { name: '👤 From',  value: `${user.name || user.email} · ${user.brand || slug}`, inline: true },
            { name: '📅 Day',   value: selectedDay,  inline: true },
            { name: '🕐 Time',  value: selectedTime, inline: true },
            { name: '💬 Note',  value: note.trim() || '—', inline: false },
          ],
          footer: { text: 'ANTCPU ADS · Campaign Hub' }, timestamp: new Date().toISOString(),
        }] }),
      }).catch(() => {});
    }
    setSubmitted(true);
    setSelectedDay(''); setSelectedTime(''); setNote('');
    setSubmitting(false);
    fetchData();
    setTimeout(() => setSubmitted(false), 4000);
  }

  // ── Derived — user's top ad ───────────────────────────────────────────────
  const topAd      = ads[0] || null;
  const tier        = topAd?.tier || 'entry';
  const tierColor   = TIER_COLOR[tier] || C.blue;
  const tierLabel   = TIER_LABEL[tier] || 'Entry';
  const next        = TIER_NEXT[tier];
  const points      = topAd?.points || 0;
  const ptsToNext   = next ? Math.max(next.pts - points, 0) : 0;
  const adUrl       = topAd?.url || '';
  const adTitle     = topAd?.title || '';

  // ── Share copy ────────────────────────────────────────────────────────────
  const shareCopy = {
    twitter:  `🔥 Check out ${user.brand || 'my brand'} in the ANTCPU ADS Arena — ${adTitle} ${adUrl} #Arena #ANTCPU`,
    linkedin: `Excited to share ${user.brand || 'my brand'}'s latest campaign in the ANTCPU ADS Arena.\n\n${adTitle}\n\nThe Arena is a live ad network where brands compete for points and visibility. Check it out: ${adUrl}`,
    whatsapp: `Hey! Check out my ad in the Arena 👉 ${adUrl} — ${adTitle}`,
    link:     adUrl,
  };

  // ── Pending ads (admin) ───────────────────────────────────────────────────
  const pendingAds      = ads.filter(a => a.status === 'pending_review');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const stallingAds     = ads.filter(a =>
    (a.points || 0) > 50 &&
    (a.click_count || 0) === 0 &&
    (a.share_count || 0) < 2
  );

  // ── Tab button helper ─────────────────────────────────────────────────────
  function TabBtn({
    id, label, active, onClick, badge,
  }: { id: string; label: string; active: boolean; onClick: () => void; badge?: number }) {
    return (
      <button
        key={id}
        onClick={onClick}
        style={{
          background:   active ? C.orange : 'transparent',
          border:       `1px solid ${active ? C.orange : C.border2}`,
          borderRadius: '8px',
          color:        active ? '#000' : C.muted,
          fontWeight:   active ? 700 : 400,
          fontSize:     '0.78rem',
          padding:      '0.4rem 0.85rem',
          cursor:       'pointer',
          position:     'relative',
          transition:   'all 0.15s',
        }}
      >
        {label}
        {badge !== undefined && badge > 0 && (
          <span style={{
            position:     'absolute',
            top:          '-6px',
            right:        '-6px',
            background:   C.red,
            color:        '#fff',
            borderRadius: '999px',
            fontSize:     '0.55rem',
            fontWeight:   800,
            padding:      '0.1rem 0.35rem',
            lineHeight:   1,
          }}>
            {badge}
          </span>
        )}
      </button>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ color: C.muted, fontSize: '0.85rem' }}>Loading...</div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // USER VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isSuper) {
    return (
      <div style={{ width: '100%' }}>

        {/* Header */}
        <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text, marginBottom: '1.25rem' }}>
          📡 Campaign Hub
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <TabBtn id="campaign" label="My Campaign" active={userTab === 'campaign'} onClick={() => setUserTab('campaign')} />
          <TabBtn id="share"    label="Share"        active={userTab === 'share'}    onClick={() => setUserTab('share')}    />
          <TabBtn id="book"     label="Book a Session" active={userTab === 'book'}   onClick={() => setUserTab('book')}     />
        </div>

        {/* ── TAB: MY CAMPAIGN ── */}
        {userTab === 'campaign' && (
          <div>
            {ads.length === 0 ? (
              <div style={{
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: '12px', padding: '1.5rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📡</div>
                <div style={{ fontSize: '0.88rem', color: C.sub, marginBottom: '1rem' }}>
                  No active campaigns yet.
                </div>
                <a href="/create-ad" style={{
                  display: 'inline-block', background: C.orange, color: '#000',
                  borderRadius: '8px', padding: '0.6rem 1.25rem',
                  fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
                }}>
                  🚀 Create Your First Ad →
                </a>
              </div>
            ) : (
              <>
                {/* Top ad card */}
                <div style={{
                  background:   C.bg,
                  border:       `1px solid ${tierColor}40`,
                  borderLeft:   `3px solid ${tierColor}`,
                  borderRadius: '12px',
                  padding:      '1.1rem 1.25rem',
                  marginBottom: '1rem',
                }}>
                  {/* Tier badge + title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, color: tierColor,
                      background: `${tierColor}15`, border: `1px solid ${tierColor}30`,
                      borderRadius: '999px', padding: '0.15rem 0.5rem',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {tierLabel}
                    </span>
                    {topAd?.pinned && (
                      <span style={{ fontSize: '0.65rem', color: C.orange }}>📌 Pinned</span>
                    )}
                    {topAd?.rank_position && (
                      <span style={{ fontSize: '0.65rem', color: C.gold, marginLeft: 'auto' }}>
                        #{topAd.rank_position} in Arena
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: C.text, marginBottom: '0.85rem' }}>
                    {adTitle.length > 50 ? adTitle.slice(0, 50) + '…' : adTitle}
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    {[
                      { label: 'Points',    value: points,                        color: C.orange },
                      { label: 'Clicks',    value: topAd?.click_count    || 0,    color: C.blue   },
                      { label: 'Shares',    value: topAd?.share_count    || 0,    color: C.green  },
                      { label: 'Reactions', value: topAd?.reaction_count || 0,    color: '#ff0080'},
                    ].map(s => (
                      <div key={s.label} style={{
                        background: C.card, border: `1px solid ${C.border}`,
                        borderRadius: '8px', padding: '0.5rem', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>
                          {s.value}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tier progress */}
                  {next && (
                    <div style={{ marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: C.muted, marginBottom: '0.35rem' }}>
                        <span>Progress to <span style={{ color: tierColor, fontWeight: 700 }}>{next.label}</span></span>
                        <span style={{ color: C.orange, fontWeight: 700 }}>
                          {ptsToNext > 0 ? `${ptsToNext} pts to go` : '✅ Unlocked'}
                        </span>
                      </div>
                      <div style={{ height: '5px', background: C.border, borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width:  `${Math.min((points / next.pts) * 100, 100)}%`,
                          background: `linear-gradient(90deg, ${tierColor}, ${tierColor}88)`,
                          borderRadius: '999px', transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Next action nudge */}
                  <div style={{
                    fontSize: '0.78rem', color: C.sub, lineHeight: 1.55,
                    borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem',
                  }}>
                    {next && ptsToNext > 0
                      ? `⚡ Share your ad to earn points and reach ${next.label} tier — ${ptsToNext} pts away. Each share = 3 pts.`
                      : `🏆 You're at ${tierLabel}. Keep sharing to maintain your position and stay pinned.`
                    }
                  </div>
                </div>

                {/* All ads summary if more than 1 */}
                {ads.length > 1 && (
                  <div style={{
                    background: C.bg, border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '0.85rem 1rem',
                  }}>
                    <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                      All Campaigns ({ads.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {ads.map((ad, i) => (
                        <div key={ad.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', color: C.muted, width: '20px' }}>#{i + 1}</span>
                          <span style={{ flex: 1, fontSize: '0.78rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ad.title}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: TIER_COLOR[ad.tier || 'entry'], fontWeight: 700 }}>
                            ⚡ {ad.points || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB: SHARE ── */}
        {userTab === 'share' && (
          <div>
            {!topAd ? (
              <div style={{ color: C.muted, fontSize: '0.85rem' }}>
                Create an ad first to generate share copy.
              </div>
            ) : (
              <>
                <div style={{
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem',
                }}>
                  <div style={{ fontSize: '0.72rem', color: C.sub, marginBottom: '0.25rem' }}>Sharing</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text }}>
                    {adTitle.length > 45 ? adTitle.slice(0, 45) + '…' : adTitle}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.2rem' }}>
                    ⚡ {points} pts · {tierLabel}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[
                    { key: 'twitter',  icon: '𝕏',  label: 'Twitter / X',  copy: shareCopy.twitter  },
                    { key: 'linkedin', icon: 'in', label: 'LinkedIn',      copy: shareCopy.linkedin },
                    { key: 'whatsapp', icon: '💬', label: 'WhatsApp',      copy: shareCopy.whatsapp },
                    { key: 'link',     icon: '🔗', label: 'Copy Link',     copy: shareCopy.link     },
                  ].map(p => (
                    <div key={p.key} style={{
                      background:   C.card,
                      border:       `1px solid ${copied === p.key ? C.green + '60' : C.border}`,
                      borderRadius: '10px',
                      padding:      '0.85rem 1rem',
                      transition:   'border-color 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>
                          {p.icon} {p.label}
                        </span>
                        <button
                          onClick={() => copyToClipboard(p.copy, setCopied, p.key)}
                          style={{
                            background:   copied === p.key ? `${C.green}20` : C.bg,
                            border:       `1px solid ${copied === p.key ? C.green : C.border2}`,
                            borderRadius: '6px',
                            color:        copied === p.key ? C.green : C.muted,
                            fontSize:     '0.72rem',
                            fontWeight:   700,
                            padding:      '0.25rem 0.65rem',
                            cursor:       'pointer',
                            transition:   'all 0.15s',
                          }}
                        >
                          {copied === p.key ? '✅ Copied' : 'Copy'}
                        </button>
                      </div>
                      <div style={{
                        fontSize:   '0.72rem',
                        color:      C.sub,
                        lineHeight: 1.5,
                        background: C.bg,
                        borderRadius: '6px',
                        padding:    '0.5rem 0.65rem',
                        wordBreak:  'break-all',
                      }}>
                        {p.copy.length > 120 ? p.copy.slice(0, 120) + '…' : p.copy}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: C.dim, lineHeight: 1.55 }}>
                  💡 Each share earns 3 points. Shares from new visitors earn bonus points.
              </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: BOOK A SESSION ── */}
        {userTab === 'book' && (
          <div>
            {submitted ? (
              <div style={{
                background: '#0a1a0a', border: `1px solid ${C.green}30`,
                borderRadius: '12px', padding: '1.5rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: C.green, marginBottom: '0.25rem' }}>
                  Request sent!
                </div>
                <div style={{ fontSize: '0.78rem', color: C.sub }}>
                  Antony will confirm via Discord.
                </div>
              </div>
            ) : (
              <div style={{
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: '12px', padding: '1.1rem 1.25rem',
              }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text, marginBottom: '0.25rem' }}>
                  Book a session with Antony ⚡
                </div>
                <div style={{ fontSize: '0.75rem', color: C.sub, marginBottom: '1rem', lineHeight: 1.5 }}>
                  Strategy call, ad review, or campaign planning — pick a time and we'll connect on Discord.
                </div>

                <label style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>
                  Day
                </label>
                <select
                  value={selectedDay}
                  onChange={e => setSelectedDay(e.target.value)}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border2}`, color: selectedDay ? C.text : C.muted, borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                >
                  <option value="">Select a day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <label style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>
                  Time Window
                </label>
                <select
                  value={selectedTime}
                  onChange={e => setSelectedTime(e.target.value)}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border2}`, color: selectedTime ? C.text : C.muted, borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                >
                  <option value="">Select a time</option>
                  {TIME_WINDOWS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <label style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>
                  What do you need help with?
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. My ad isn't getting clicks, want to discuss strategy..."
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border2}`, color: C.text, borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.82rem', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.85rem' }}
                />

                <button
                  onClick={submitBooking}
                  disabled={!selectedDay || !selectedTime || submitting}
                  style={{
                    width: '100%',
                    background:   selectedDay && selectedTime ? C.orange : C.border,
                    border:       'none',
                    color:        selectedDay && selectedTime ? '#000' : C.muted,
                    borderRadius: '8px',
                    padding:      '0.75rem',
                    fontSize:     '0.88rem',
                    fontWeight:   700,
                    cursor:       selectedDay && selectedTime ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? 'Sending...' : '📅 Request Session'}
                </button>
              </div>
            )}

            {/* User's existing bookings */}
            {bookings.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  Your Requests
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {bookings.map(b => (
                    <div key={b.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', color: C.text, fontWeight: 600 }}>
                          {b.day} · {b.time_window}
                        </div>
                        {b.note && (
                          <div style={{ fontSize: '0.72rem', color: C.sub, marginTop: '0.1rem' }}>
                            {b.note.slice(0, 50)}{b.note.length > 50 ? '…' : ''}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        color: statusColor(b.status),
                        background: `${statusColor(b.status)}15`,
                        border: `1px solid ${statusColor(b.status)}30`,
                        borderRadius: '999px', padding: '0.15rem 0.5rem',
                      }}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text }}>
          📡 Campaign Hub
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', alignItems: 'center' }}>
          <span style={{ color: C.orange, fontWeight: 700 }}>{total} active</span>
          {pendingAds.length > 0 && (
            <span style={{ color: C.red, fontWeight: 700 }}>⚠️ {pendingAds.length} pending</span>
          )}
          <button
            onClick={fetchData}
            style={{ background: 'none', border: `1px solid ${C.border2}`, borderRadius: '6px', color: C.muted, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Admin tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <TabBtn
          id="network"
          label="Network"
          active={adminTab === 'network'}
          onClick={() => setAdminTab('network')}
          badge={pendingAds.length}
        />
        <TabBtn
          id="bookings"
          label="Bookings"
          active={adminTab === 'bookings'}
          onClick={() => setAdminTab('bookings')}
          badge={pendingBookings.length}
        />
      </div>

      {/* ── ADMIN TAB: NETWORK ── */}
      {adminTab === 'network' && (
        <div>

          {/* Network insight strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { label: 'Ads',       value: total,                                                                    color: C.orange },
              { label: 'Clicks',    value: ads.reduce((s, a) => s + (a.click_count    || 0), 0).toLocaleString(),   color: C.blue   },
              { label: 'Shares',    value: ads.reduce((s, a) => s + (a.share_count    || 0), 0).toLocaleString(),   color: C.green  },
              { label: 'Reactions', value: ads.reduce((s, a) => s + (a.reaction_count || 0), 0).toLocaleString(),   color: '#ff0080'},
            ].map(s => (
              <div key={s.label} style={{
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: '8px', padding: '0.6rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.6rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Pending review queue */}
          {pendingAds.length > 0 && (
            <div style={{
              background: `${C.red}08`, border: `1px solid ${C.red}30`,
              borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem',
            }}>
              <div style={{ fontSize: '0.72rem', color: C.red, fontWeight: 700, marginBottom: '0.65rem' }}>
                ⚠️ Pending Review ({pendingAds.length})
              </div>
              {pendingAds.map(ad => (
                <div key={ad.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0', borderBottom: `1px solid ${C.red}15`, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>{ad.title}</div>
                    <div style={{ fontSize: '0.7rem', color: C.muted }}>{ad.brand} · {ad.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => approveAd(ad.id)} disabled={updating === ad.id}
                      style={{ background: `${C.green}15`, border: `1px solid ${C.green}40`, color: C.green, borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                      ✅ Approve
                    </button>
                    <button onClick={() => rejectAd(ad.id)} disabled={updating === ad.id}
                      style={{ background: `${C.red}15`, border: `1px solid ${C.red}30`, color: C.red, borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stalling ads alert */}
          {stallingAds.length > 0 && (
            <div style={{
              background: `${C.gold}08`, border: `1px solid ${C.gold}30`,
              borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem',
            }}>
              <div style={{ fontSize: '0.72rem', color: C.gold, fontWeight: 700, marginBottom: '0.5rem' }}>
                ⚠️ Stalling Ads ({stallingAds.length}) — high points, low engagement
              </div>
              {stallingAds.map(ad => (
                <div key={ad.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: `1px solid ${C.gold}15` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', color: C.text, fontWeight: 600 }}>{ad.title}</div>
                    <div style={{ fontSize: '0.68rem', color: C.muted }}>{ad.brand} · ⚡ {ad.points} pts · 👆 {ad.click_count || 0} clicks</div>
                  </div>
                  <button
                    onClick={() => fetch('/api/scout/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad_id: ad.id }) }).then(() => fetchData())}
                    style={{ background: 'transparent', border: `1px solid ${C.border2}`, color: C.muted, borderRadius: '6px', padding: '0.2rem 0.55rem', fontSize: '0.68rem', cursor: 'pointer' }}
                  >
                    ⚡ Rescore
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tier groups */}
          {groups.map(g => (
            <div key={g.tier} style={{ marginBottom: '0.65rem' }}>
              <button
                onClick={() => setExpanded(expanded === g.tier ? null : g.tier)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  background: C.bg, border: `1px solid ${TIER_COLOR[g.tier]}30`,
                  borderLeft: `3px solid ${TIER_COLOR[g.tier]}`,
                  borderRadius: expanded === g.tier ? '10px 10px 0 0' : '10px',
                  padding: '0.7rem 0.85rem', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: TIER_COLOR[g.tier] }}>
                    {TIER_LABEL[g.tier]}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: C.muted }}>{g.count} ad{g.count !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', fontSize: '0.72rem' }}>
                  <span style={{ color: C.orange, fontWeight: 700 }}>⚡ {g.totalPoints}</span>
                  <span style={{ color: C.blue }}>👆 {g.totalClicks}</span>
                  <span style={{ color: C.green }}>↗ {g.totalShares}</span>
                  <span style={{ color: '#ff0080' }}>🔥 {g.totalReactions}</span>
                  <span style={{ color: C.muted, fontSize: '0.7rem' }}>{expanded === g.tier ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded === g.tier && (
                <div style={{
                  border: `1px solid ${TIER_COLOR[g.tier]}20`,
                  borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden',
                }}>
                  {ads.filter(a => (a.tier || 'entry') === g.tier).map(ad => (
                    <div key={ad.id} style={{ padding: '0.75rem 0.85rem', borderBottom: `1px solid ${C.border}`, background: C.card2 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.text }}>{ad.title}</div>
                          <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.1rem' }}>
                            {ad.brand} · {ad.email}
                          </div>
                        </div>
                        {ad.pinned && <span style={{ fontSize: '0.65rem', color: C.orange }}>📌</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: C.muted, marginBottom: '0.6rem' }}>
                        <span style={{ color: C.orange }}>⚡ {ad.points || 0}</span>
                        <span>👆 {ad.click_count || 0}</span>
                        <span>↗ {ad.share_count || 0}</span>
                        <span>🔥 {ad.reaction_count || 0}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                          value={ad.tier || 'entry'}
                          onChange={e => updateTier(ad.id, e.target.value)}
                          disabled={updating === ad.id}
                          style={{ background: C.card, border: `1px solid ${TIER_COLOR[ad.tier || 'entry']}`, color: TIER_COLOR[ad.tier || 'entry'], borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {TIERS.map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                        </select>
                        <button onClick={() => togglePin(ad)} disabled={updating === ad.id}
                          style={{ background: ad.pinned ? `${C.orange}15` : 'transparent', border: `1px solid ${ad.pinned ? C.orange : C.border2}`, color: ad.pinned ? C.orange : C.muted, borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                          {ad.pinned ? '📌 Unpin' : '+ Pin'}
                        </button>
                        <button
                          onClick={() => fetch('/api/scout/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad_id: ad.id }) }).then(() => fetchData())}
                          style={{ background: 'transparent', border: `1px solid ${C.border2}`, color: C.muted, borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                          ⚡ Rescore
                        </button>
                        <a href={`/profile/${encodeURIComponent(ad.email)}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: '0.7rem', color: C.muted, textDecoration: 'none' }}>
                          👤 Profile
                        </a>
                        {updating === ad.id && (
                          <span style={{ fontSize: '0.65rem', color: C.muted }}>saving...</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ADMIN TAB: BOOKINGS ── */}
      {adminTab === 'bookings' && (
        <div>
          {bookings.length === 0 ? (
            <div style={{ color: C.muted, fontSize: '0.85rem', padding: '1rem 0' }}>
              No bookings yet.
            </div>
          ) : (
            <>
              {/* Pending — action required */}
              {pendingBookings.length > 0 && (
                <div style={{
                  background: `${C.orange}08`, border: `1px solid ${C.orange}30`,
                  borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem',
                }}>
                  <div style={{ fontSize: '0.72rem', color: C.orange, fontWeight: 700, marginBottom: '0.65rem' }}>
                    ⚠️ Pending ({pendingBookings.length})
                  </div>
                  {pendingBookings.map(b => (
                    <div key={b.id} style={{ padding: '0.65rem 0', borderBottom: `1px solid ${C.orange}15` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.text }}>{b.name} · {b.brand}</div>
                          <div style={{ fontSize: '0.72rem', color: C.muted }}>{b.email}</div>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: C.sub }}>{b.day} · {b.time_window}</div>
                      </div>
                      {b.note && (
                        <div style={{ fontSize: '0.75rem', color: C.sub, fontStyle: 'italic', marginBottom: '0.5rem' }}>
                          "{b.note}"
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => updateBookingStatus(b.id, 'confirmed')} disabled={updating === b.id}
                          style={{ background: `${C.green}15`, border: `1px solid ${C.green}40`, color: C.green, borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                          ✅ Confirm
                        </button>
                        <button onClick={() => updateBookingStatus(b.id, 'declined')} disabled={updating === b.id}
                          style={{ background: `${C.red}15`, border: `1px solid ${C.red}30`, color: C.red, borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                          ✕ Decline
                        </button>
                        {updating === b.id && <span style={{ fontSize: '0.65rem', color: C.muted }}>saving...</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* All bookings */}
              <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                All Bookings ({bookings.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {bookings.map(b => (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px',
                    flexWrap: 'wrap', gap: '0.5rem',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.text }}>{b.name} · {b.brand}</div>
                      <div style={{ fontSize: '0.7rem', color: C.muted }}>{b.day} · {b.time_window}</div>
                      {b.note && (
                        <div style={{ fontSize: '0.68rem', color: C.dim, fontStyle: 'italic' }}>
                          "{b.note.slice(0, 60)}{b.note.length > 60 ? '…' : ''}"
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700,
                      color: statusColor(b.status),
                      background: `${statusColor(b.status)}15`,
                      border: `1px solid ${statusColor(b.status)}30`,
                      borderRadius: '999px', padding: '0.15rem 0.5rem', flexShrink: 0,
                    }}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
  

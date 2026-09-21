'use client';
// app/modules/posts/index.tsx
// ─── Quick Share — generate and copy platform-ready share copy for active ads ──
//
// Repurposed from Posts (which was a duplicate ad creator inserting into ads table).
//
// What it does now:
//   USER VIEW:
//     — Shows all active ads for this brand
//     — For each ad: pre-written copy for X, LinkedIn, WhatsApp, link
//     — One-tap copy to clipboard per platform
//     — Points + tier shown per ad so user knows which to promote
//     — "Which ad should I share?" nudge — highest points first
//
//   ADMIN VIEW:
//     — Same share tool for any ad
//     — Plus: quick archive + pin controls per ad
//     — Network share stats: total shares across all ads
//
// No DB writes in user view — pure utility.
// Admin view retains pin/archive controls.
//
// v2 (Sep 2026) — repurposed from duplicate ad creator to Quick Share tool
// ─────────────────────────────────────────────────────────────────────────────

import { useState }              from 'react';
import { ModuleContext, Ad }     from '../types';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:     '#0a0a0a',
  card:   '#111',
  border: '#1a1a1a',
  border2:'#222',
  orange: '#f0883e',
  gold:   '#D4AF37',
  green:  '#22c55e',
  blue:   '#0070f3',
  muted:  '#555',
  dim:    '#333',
  text:   '#e0e0e0',
  sub:    '#888',
};

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

// ─── Platforms ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { key: 'twitter',  icon: '𝕏',  label: 'Twitter / X'  },
  { key: 'linkedin', icon: 'in', label: 'LinkedIn'      },
  { key: 'whatsapp', icon: '💬', label: 'WhatsApp'      },
  { key: 'link',     icon: '🔗', label: 'Copy Link'     },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCopy(platform: string, ad: Ad, brand: string): string {
  const title = ad.title || '';
  const url   = ad.url   || '';
  switch (platform) {
    case 'twitter':
      return `🔥 ${title} — ${brand} is live in the ANTCPU ADS Arena. Check it out 👉 ${url} #Arena #ANTCPU`;
    case 'linkedin':
      return `Excited to share ${brand}'s latest campaign in the ANTCPU ADS Arena.\n\n${title}\n\nThe Arena is a live ad network where brands compete for points and visibility. Every share counts.\n\n👉 ${url}`;
    case 'whatsapp':
      return `Hey! Check out ${brand}'s ad in the Arena 👉 ${url} — ${title}`;
    case 'link':
    default:
      return url;
  }
}

function copyToClipboard(
  text: string,
  setCopied: (k: string) => void,
  key: string,
) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }).catch(() => {});
}

// ─── Ad Share Card ────────────────────────────────────────────────────────────

function AdShareCard({
  ad,
  brand,
  isSuper,
  onPin,
  onArchive,
  pinning,
}: {
  ad:        Ad;
  brand:     string;
  isSuper:   boolean;
  onPin?:    (ad: Ad) => void;
  onArchive?:(id: string) => void;
  pinning?:  string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied,   setCopied]   = useState('');

  const tier      = ad.tier || 'entry';
  const tierColor = TIER_COLOR[tier] || C.blue;
  const tierLabel = TIER_LABEL[tier] || 'Entry';

  return (
    <div style={{
      background:   C.bg,
      border:       `1px solid ${expanded ? tierColor + '40' : C.border}`,
      borderLeft:   `3px solid ${expanded ? tierColor : C.border}`,
      borderRadius: '12px',
      overflow:     'hidden',
      transition:   'border-color 0.2s',
    }}>
      {/* Ad header row — always visible */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '0.75rem',
          padding:    '0.85rem 1rem',
          cursor:     'pointer',
        }}
      >
        {/* Tier dot */}
        <span style={{
          width:        '8px',
          height:       '8px',
          borderRadius: '50%',
          background:   tierColor,
          flexShrink:   0,
          boxShadow:    `0 0 5px ${tierColor}60`,
        }} />

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize:     '0.88rem',
            fontWeight:   700,
            color:        C.text,
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
          }}>
            {ad.title}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.68rem', color: C.muted, marginTop: '0.15rem', flexWrap: 'wrap' }}>
            <span style={{ color: tierColor, fontWeight: 700 }}>{tierLabel}</span>
            <span>⚡ {ad.points || 0} pts</span>
            {(ad.share_count || 0) > 0 && <span>↗ {ad.share_count} shares</span>}
            {(ad.click_count || 0) > 0 && <span>👆 {ad.click_count} clicks</span>}
            {ad.pinned && <span style={{ color: C.orange }}>📌</span>}
          </div>
        </div>

        {/* Expand toggle */}
        <span style={{ fontSize: '0.72rem', color: C.muted, flexShrink: 0 }}>
          {expanded ? '▲' : '▼ Share'}
        </span>
      </div>

      {/* Expanded share panel */}
      {expanded && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding:   '0.85rem 1rem',
          background: C.card,
        }}>

          {/* Platform copy buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {PLATFORMS.map(p => {
              const copy    = buildCopy(p.key, ad, brand);
              const isCopied = copied === p.key;
              return (
                <div key={p.key} style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  gap:            '0.5rem',
                  background:     C.bg,
                  border:         `1px solid ${isCopied ? C.green + '50' : C.border}`,
                  borderRadius:   '8px',
                  padding:        '0.55rem 0.75rem',
                  transition:     'border-color 0.2s',
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isCopied ? C.green : C.text }}>
                    {p.icon} {p.label}
                  </span>
                  <button
                    onClick={() => copyToClipboard(copy, setCopied, p.key)}
                    style={{
                      background:   isCopied ? `${C.green}20` : 'transparent',
                      border:       `1px solid ${isCopied ? C.green : C.border2}`,
                      borderRadius: '6px',
                      color:        isCopied ? C.green : C.muted,
                      fontSize:     '0.72rem',
                      fontWeight:   700,
                      padding:      '0.2rem 0.6rem',
                      cursor:       'pointer',
                      transition:   'all 0.15s',
                      whiteSpace:   'nowrap',
                    }}
                  >
                    {isCopied ? '✅ Copied' : 'Copy'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Preview of copy */}
          <div style={{
            fontSize:     '0.7rem',
            color:        C.sub,
            lineHeight:   1.5,
            background:   `${C.bg}`,
            border:       `1px solid ${C.border}`,
            borderRadius: '6px',
            padding:      '0.5rem 0.65rem',
            marginBottom: isSuper ? '0.75rem' : 0,
            wordBreak:    'break-all',
          }}>
            {buildCopy('twitter', ad, brand).slice(0, 100)}…
          </div>

          {/* Admin controls */}
          {isSuper && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <a
                href={ad.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.72rem', color: C.orange, textDecoration: 'none', fontWeight: 600 }}
              >
                View →
              </a>
              {onPin && (
                <button
                  onClick={() => onPin(ad)}
                  disabled={pinning === ad.id}
                  style={{
                    background:   ad.pinned ? `${C.orange}15` : 'transparent',
                    border:       `1px solid ${ad.pinned ? C.orange : C.border2}`,
                    color:        ad.pinned ? C.orange : C.muted,
                    borderRadius: '6px',
                    padding:      '0.2rem 0.6rem',
                    fontSize:     '0.7rem',
                    fontWeight:   700,
                    cursor:       'pointer',
                  }}
                >
                  {ad.pinned ? '📌 Unpin' : '+ Pin'}
                </button>
              )}
              {onArchive && (
                <button
                  onClick={() => onArchive(ad.id)}
                  style={{
                    background:   'transparent',
                    border:       `1px solid ${C.border2}`,
                    color:        C.muted,
                    borderRadius: '6px',
                    padding:      '0.2rem 0.6rem',
                    fontSize:     '0.7rem',
                    cursor:       'pointer',
                  }}
                >
                  Archive
                </button>
              )}
              <a
                href={`/profile/${encodeURIComponent(ad.email)}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.7rem', color: C.muted, textDecoration: 'none' }}
              >
                👤
              </a>
              {pinning === ad.id && (
                <span style={{ fontSize: '0.65rem', color: C.muted }}>saving...</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PostsModule({ slug, ads, supabase, user, isSuper }: ModuleContext) {
  const [localAds, setLocalAds] = useState<Ad[]>(ads);
  const [pinning,  setPinning]  = useState<string | null>(null);

  const brandName = user.brand || slug;
  const brandAds  = localAds
    .filter(a => a.brand?.toLowerCase().includes(brandName.toLowerCase()))
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  // ── Admin: pin ────────────────────────────────────────────────────────────
  async function handlePin(ad: Ad) {
    setPinning(ad.id);
    await supabase.from('ads').update({ pinned: !ad.pinned }).eq('id', ad.id);
    setLocalAds(prev => prev.map(a => a.id === ad.id ? { ...a, pinned: !a.pinned } : a));
    setPinning(null);
  }

  // ── Admin: archive ────────────────────────────────────────────────────────
  async function handleArchive(adId: string) {
    await supabase.from('ads').update({ status: 'archived' }).eq('id', adId);
    setLocalAds(prev => prev.filter(a => a.id !== adId));
  }

  // ── Network share stats (admin) ───────────────────────────────────────────
  const totalShares    = brandAds.reduce((s, a) => s + (a.share_count || 0), 0);
  const totalClicks    = brandAds.reduce((s, a) => s + (a.click_count || 0), 0);
  const totalPoints    = brandAds.reduce((s, a) => s + (a.points      || 0), 0);
  const topShareAd     = [...brandAds].sort((a, b) => (b.share_count || 0) - (a.share_count || 0))[0];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text }}>
          🔗 Quick Share
        </div>
        <span style={{
          fontSize:     '0.68rem',
          color:        C.muted,
          background:   C.bg,
          border:       `1px solid ${C.border}`,
          borderRadius: '999px',
          padding:      '0.15rem 0.5rem',
        }}>
          {brandAds.length} ad{brandAds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Admin insight strip */}
      {isSuper && brandAds.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          {[
            { label: 'Total Shares', value: totalShares, color: C.green  },
            { label: 'Total Clicks', value: totalClicks, color: C.blue   },
            { label: 'Total Points', value: totalPoints, color: C.orange },
          ].map(s => (
            <div key={s.label} style={{
              background:   C.bg,
              border:       `1px solid ${C.border}`,
              borderRadius: '8px',
              padding:      '0.6rem',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.6rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top share nudge */}
      {brandAds.length > 0 && (
        <div style={{
          background:   `${C.orange}08`,
          border:       `1px solid ${C.orange}25`,
          borderRadius: '10px',
          padding:      '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize:     '0.78rem',
          color:        C.sub,
          lineHeight:   1.55,
        }}>
          <span style={{ color: C.orange, fontWeight: 700 }}>⚡ Share tip: </span>
          {topShareAd
            ? `"${topShareAd.title.slice(0, 40)}${topShareAd.title.length > 40 ? '…' : ''}" is your top performer with ${topShareAd.share_count || 0} shares. Share it again to keep climbing.`
            : `Share your highest-point ad first — it earns the most visibility per share.`
          }
          <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: C.dim }}>
            Each share = 3 pts · Shares from new visitors = bonus pts · Tap any ad below to expand share options.
          </div>
        </div>
      )}

      {/* Empty state */}
      {brandAds.length === 0 && (
        <div style={{
          background:   C.bg,
          border:       `1px solid ${C.border}`,
          borderRadius: '12px',
          padding:      '1.5rem',
          textAlign:    'center',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔗</div>
          <div style={{ fontSize: '0.88rem', color: C.sub, marginBottom: '1rem' }}>
            No active ads to share yet.
          </div>
          <a
            href="/create-ad"
            style={{
              display:      'inline-block',
              background:   C.orange,
              color:        '#000',
              borderRadius: '8px',
              padding:      '0.6rem 1.25rem',
              fontSize:     '0.85rem',
              fontWeight:   700,
              textDecoration: 'none',
            }}
          >
            🚀 Create Your First Ad →
          </a>
        </div>
      )}

      {/* Ad share cards — sorted by points desc */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {brandAds.map(ad => (
          <AdShareCard
            key={ad.id}
            ad={ad}
            brand={brandName}
            isSuper={!!isSuper}
            onPin={isSuper ? handlePin : undefined}
            onArchive={isSuper ? handleArchive : undefined}
            pinning={pinning}
          />
        ))}
      </div>

      {/* Footer tip */}
      {brandAds.length > 0 && (
        <div style={{
          marginTop:  '1rem',
          fontSize:   '0.7rem',
          color:      C.dim,
          lineHeight: 1.55,
          textAlign:  'center',
        }}>
          💡 Sharing consistently is the fastest way to climb the Arena ladder.
          Top sharers earn the <span style={{ color: C.gold }}>🏆 Country Champion</span> badge.
        </div>
      )}

    </div>
  );
}

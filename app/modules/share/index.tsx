'use client';

import { useState }       from 'react';
import { createClient }   from '@supabase/supabase-js';
import { ModuleContext }  from '../types';
import { PLATFORMS, getShareAction } from '../../lib/socialShare';
import type { ShareContext }         from '../../lib/socialShare';
import { recordShare }               from '../../lib/tracking';
import { SOURCE }                    from '../../lib/tracking/sources';

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SOCIAL_PACK_API = 'https://amandaland.vercel.app/api/social-pack';

// ─── Word-boundary truncate — matches ArenaUniversalClient ───────────────────
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max);
  return (cut > 0 ? text.slice(0, cut) : text.slice(0, max)) + '…';
}

// ─── Build ShareContext — same shape as ArenaUniversalClient.buildShareCtx ───
function buildShareCtx(
  ad: ModuleContext['ads'][0],
  url: string
): ShareContext {
  return {
    brand:       ad.brand,
    title:       ad.title,
    description: ad.description,
    url,
    profileUrl:  `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(ad.email)}`,
    category:    ad.category,
    country:     ad.country,
    isChampion:  ad.is_country_champion,
    pointsLabel: ad.points > 0 ? `⚡ ${ad.points} pts` : undefined,
  };
}

// ─── Share platforms — mobile-first, high-value only ─────────────────────────
// Keys match PLATFORMS registry so getShareAction works for intent URLs.
// Local list kept for the platform grid UI only.
const SHARE_PLATFORM_KEYS = ['whatsapp', 'telegram', 'twitter', 'linkedin'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ShareModule({ slug, user, ads, isSuper }: ModuleContext) {
  const [copied,     setCopied]     = useState<string | null>(null);
  const [shareCount, setShareCount] = useState(0);

  // ── Top ad = ads[0] — sorted pinned DESC, points DESC by Supabase ─────────
  // Arena share gives points to the top ad — builds the arena goal faster
  const topAd    = ads[0] || null;
  const arenaUrl = topAd
    ? `https://antcpu-ads.vercel.app/s/${topAd.id.slice(0, 8)}`
    : `https://antcpu-ads.vercel.app/arena/${slug}`;

  // ── Share text — uses same buildPost system as every other ad ────────────
  function getShareText(platformKey = 'telegram'): string {
    if (!topAd) {
      return `Check out the ${slug} Arena on ANTCPU ADS ⚡\n\n→ ${arenaUrl}\n\n#antcpuads`;
    }
    const platform = PLATFORMS.find(p => p.key === platformKey)
                  || PLATFORMS.find(p => p.key === 'telegram')!;
    return getShareAction(platform, buildShareCtx(topAd, arenaUrl)).text;
  }

  const totalShares = ads.reduce((s, a) => s + (a.share_count || 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.click_count || 0), 0);
  const totalPoints = ads.reduce((s, a) => s + (a.points     || 0), 0);

  // ── Write share to Supabase — always targets topAd ───────────────────────
  async function writeShare(platform: string) {
    if (!topAd) return;
    await recordShare(
      {
        id:          topAd.id,
        brand:       topAd.brand,
        title:       topAd.title,
        email:       topAd.email,
        share_count: topAd.share_count || 0,
        url:         arenaUrl,
      },
      user.email || 'visitor',
      platform,
      SOURCE.ARENA_FEED,
      supabase
    );
    setShareCount(c => c + 1);
  }

  // ── Mega copy — same logic as ArenaUniversalClient.handleMegaCopy ────────
  async function handleMegaCopy() {
    try {
      let megaText: string;
      if (topAd?.image_url) {
        const uploadIdx = topAd.image_url.indexOf('/upload/');
        if (uploadIdx !== -1) {
          const afterUpload = topAd.image_url.slice(uploadIdx + 8);
          const parts       = afterUpload.split('/');
          const publicId    = parts[0].includes(',')
            ? parts.slice(1).join('/')
            : afterUpload;
          const res = await fetch(
            `${SOCIAL_PACK_API}?id=${encodeURIComponent(publicId)}&brand=${encodeURIComponent(topAd.brand)}&url=${encodeURIComponent(arenaUrl)}`
          );
          megaText = res.ok
            ? (await res.json()).megaCopy?.text || getShareText('telegram')
            : getShareText('telegram');
        } else {
          megaText = getShareText('telegram');
        }
      } else {
        megaText = getShareText('telegram');
      }
      await navigator.clipboard.writeText(megaText);
      setCopied('mega');
      setTimeout(() => setCopied(null), 2000);
      await writeShare('Mega Copy');   // ✅ writes to Supabase
    } catch {}
  }

  // ── Core share action ─────────────────────────────────────────────────────
  async function handleShare(platformKey?: string) {
    // Mobile native share sheet — best UX, zero friction
    if (!platformKey && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: topAd?.title || `${slug} Arena`,
          text:  getShareText(),
          url:   arenaUrl,
        });
        setCopied('native');
        setTimeout(() => setCopied(null), 2000);
        await writeShare('Native Share');   // ✅ writes to Supabase
        return;
      } catch {}
    }

    // Desktop platform intent — uses PLATFORMS registry for consistent copy
    if (platformKey) {
      const platform = PLATFORMS.find(p => p.key === platformKey);
      if (!platform) return;
      const { url: intentUrl } = getShareAction(
        platform,
        buildShareCtx(topAd!, arenaUrl)
      );
      if (intentUrl) window.open(intentUrl, '_blank', 'noopener,noreferrer');
      await writeShare(platform.label);   // ✅ writes to Supabase
      return;
    }

    // Fallback — copy to clipboard
    try { await navigator.clipboard.writeText(arenaUrl); } catch {}
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
    await writeShare('Copy Link');        // ✅ writes to Supabase
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(arenaUrl); } catch {}
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
    await writeShare('Copy Link');        // ✅ writes to Supabase
  }

  const isMobile = typeof navigator !== 'undefined' && !!navigator.share;

  // ─── Shared UI pieces ─────────────────────────────────────────────────────

  // ✅ Sticky header — stays visible as user scrolls the module zone
  // top: 57px clears the ArenaNav (padding 1.2rem × 2 + ~2px border ≈ 57px)
  const sectionHeader = (label: string) => (
    <div style={{
      position:      'sticky',
      top:           57,
      zIndex:        10,
      background:    '#0a0a0a',
      paddingTop:    '0.4rem',
      paddingBottom: '0.5rem',
      fontSize:      '0.7rem',
      color:         '#555',
      fontWeight:    700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom:  '0.75rem',
    }}>
      {label}
    </div>
  );

  const urlBox = (
    <div style={{
      background: '#0a0a0a', border: '1px solid #1a1a1a',
      borderRadius: '8px', padding: '0.6rem 0.75rem',
      fontSize: '0.72rem', color: '#555',
      marginBottom: '0.75rem', wordBreak: 'break-all',
    }}>
      {arenaUrl}
    </div>
  );

  const copyBtn = (
    <button
      onClick={copyLink}
      style={{
        width: '100%', background: copied === 'link' ? '#22c55e' : '#f0883e',
        border: 'none', color: '#000', borderRadius: '8px',
        padding: '0.6rem', fontSize: '0.82rem', fontWeight: 700,
        cursor: 'pointer', marginBottom: '0.5rem',
      }}>
      {copied === 'link' ? '✅ Copied!' : '📋 Copy Arena Link'}
    </button>
  );

  const megaCopyBtn = (
    <button
      onClick={handleMegaCopy}
      style={{
        width: '100%',
        background: copied === 'mega' ? '#22c55e' : '#1a1a1a',
        border: '1px solid #333', color: '#fff', borderRadius: '8px',
        padding: '0.6rem', fontSize: '0.82rem', fontWeight: 700,
        cursor: 'pointer', marginBottom: '0.75rem',
      }}>
      {copied === 'mega' ? '✅ Copied!' : '📋 Mega Copy — full share package'}
    </button>
  );

  const mainShareBtn = (
    <button
      onClick={() => handleShare()}
      style={{
        width: '100%',
        background: copied === 'native' ? '#22c55e' : '#0070f3',
        border: 'none', color: '#fff', borderRadius: '8px',
        padding: '0.7rem', fontSize: '0.88rem', fontWeight: 700,
        cursor: 'pointer', marginBottom: '0.75rem',
      }}>
      {copied === 'native'
        ? '✅ Shared!'
        : isMobile
          ? '↗ Share via your apps'
          : '↗ Share Arena'}
    </button>
  );

  // Platform grid — uses PLATFORMS registry for icons/colors/labels
  const platformGrid = (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '0.5rem', marginBottom: '0.75rem',
    }}>
      {PLATFORMS
        .filter(p => SHARE_PLATFORM_KEYS.includes(p.key))
        .map(p => (
          <button
            key={p.key}
            onClick={() => handleShare(p.key)}
            style={{
              background: `${p.color}15`, border: `1px solid ${p.color}30`,
              borderRadius: '8px', padding: '0.6rem 0.25rem',
              cursor: 'pointer', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
            }}>
            <span style={{ fontSize: '1.1rem' }}>{p.icon}</span>
            <span style={{ fontSize: '0.6rem', color: '#aaa', fontWeight: 600 }}>
              {p.label}
            </span>
          </button>
        ))}
    </div>
  );

  const sessionCount = shareCount > 0 && (
    <div style={{ fontSize: '0.68rem', color: '#555', textAlign: 'center', marginTop: '0.5rem' }}>
      ↗ {shareCount} share{shareCount !== 1 ? 's' : ''} this session
    </div>
  );

  // ─── User view ────────────────────────────────────────────────────────────
  if (!isSuper) {
    return (
      <div>
        {sectionHeader('🔗 Share Arena')}
        {urlBox}
        {mainShareBtn}
        {!isMobile && (
          <>
            <div style={{ fontSize: '0.65rem', color: '#444', marginBottom: '0.5rem', textAlign: 'center' }}>
              or share directly to:
            </div>
            {platformGrid}
          </>
        )}
        {copyBtn}
        {megaCopyBtn}
        {sessionCount}
      </div>
    );
  }

  // ─── Super admin view ─────────────────────────────────────────────────────
  return (
    <div>
      {sectionHeader('🔗 Share Arena — Admin')}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total Shares', value: totalShares, color: '#22c55e' },
          { label: 'Total Clicks', value: totalClicks, color: '#0070f3' },
          { label: 'Total Points', value: totalPoints, color: '#f0883e' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#0a0a0a', border: '1px solid #1a1a1a',
            borderRadius: '8px', padding: '0.6rem',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.62rem', color: '#555', marginTop: '0.15rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {urlBox}
      {mainShareBtn}
      <div style={{
        fontSize: '0.7rem', color: '#555', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem',
      }}>
        Share via Platform
      </div>
      {platformGrid}
      {copyBtn}
      {megaCopyBtn}

      {/* Per-ad breakdown */}
      {ads.length > 0 && (
        <>
          <div style={{
            fontSize: '0.7rem', color: '#555', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            Per-Ad Share Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {[...ads]
              .sort((a, b) => (b.share_count || 0) - (a.share_count || 0))
              .slice(0, 8)
              .map(ad => (
                <div key={ad.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.75rem', color: '#fff', fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {ad.title}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#555' }}>{ad.brand}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>
                      ↗ {ad.share_count || 0}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#555' }}>
                      👆 {ad.click_count || 0}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {sessionCount}
    </div>
  );
}

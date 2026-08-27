'use client';

import { useState } from 'react';
import { ModuleContext } from '../types';

// ✅ notifyDiscord REMOVED — Discord is admin-only, not a share destination
// ✅ PLATFORMS replaced with curated mobile-first list below

// ─── Share platforms — mobile-first, high-value only ─────────────────────────
//
// Mobile:  navigator.share() fires the phone's native share sheet
//          → user picks WhatsApp, Telegram, iMessage, etc from their own apps
//          → zero friction, one tap
//
// Desktop: intent URLs open the platform directly in a new tab
//          → Copy Link as universal fallback
//
// REMOVED: Discord (admin only), Facebook (broken intents),
//          TikTok, Instagram, YouTube (no web share intent)
// ─────────────────────────────────────────────────────────────────────────────

const SHARE_PLATFORMS = [
  {
    key:    'whatsapp',
    label:  'WhatsApp',
    icon:   '💬',
    color:  '#25D366',
    intent: (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    key:    'telegram',
    label:  'Telegram',
    icon:   '✈️',
    color:  '#2AABEE',
    intent: (text: string, url: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key:    'twitter',
    label:  'X / Twitter',
    icon:   '𝕏',
    color:  '#fff',
    intent: (text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    key:    'linkedin',
    label:  'LinkedIn',
    icon:   '💼',
    color:  '#0A66C2',
    intent: (_: string, url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleContext = {
  slug:    string;
  user:    { email?: string };
  ads:     {
    id: string; brand: string; title: string; description: string;
    category?: string; email?: string;
    share_count?: number; click_count?: number; points?: number;
  }[];
  isSuper: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareModule({ slug, user, ads, isSuper }: ModuleContext) {
  const [copied,     setCopied]     = useState<string | null>(null);
  const [shareCount, setShareCount] = useState(0);

  const topAd    = ads[0] || null;
  const arenaUrl = topAd
    ? `https://antcpu-ads.vercel.app/s/${topAd.id.slice(0, 8)}`
    : `https://antcpu-ads.vercel.app/arena/${slug}`;

  const shareText = topAd
    ? `${topAd.brand} is live in the Arena ⚡\n\n"${topAd.title}"\n\n${topAd.description.slice(0, 100)}\n\n→ ${arenaUrl}\n\n#antcpuads`
    : `Check out the ${slug} Arena on ANTCPU ADS ⚡\n\n→ ${arenaUrl}\n\n#antcpuads`;

  const totalShares = ads.reduce((s, a) => s + (a.share_count || 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.click_count || 0), 0);
  const totalPoints = ads.reduce((s, a) => s + (a.points     || 0), 0);

  // ── Core share action ─────────────────────────────────────────────────────
  // Mobile:  native share sheet — phone picks the app
  // Desktop: open platform intent URL
  // Fallback: copy to clipboard

  async function handleShare(platformKey?: string) {
    setShareCount(c => c + 1);

    // 🔒 No Discord notify — share events tracked via Supabase/scout only

    // Mobile native share sheet — best UX, zero friction
    if (!platformKey && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: topAd?.title || `${slug} Arena`,
          text:  shareText,
          url:   arenaUrl,
        });
        setCopied('native');
        setTimeout(() => setCopied(null), 2000);
        return;
      } catch {} // user cancelled — no error needed
    }

    // Desktop platform intent
    if (platformKey) {
      const platform = SHARE_PLATFORMS.find(p => p.key === platformKey);
      if (!platform) return;
      const intentUrl = platform.intent(shareText, arenaUrl);
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Fallback — copy to clipboard
    try { await navigator.clipboard.writeText(arenaUrl); } catch {}
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(arenaUrl); } catch {}
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Detect mobile for button label ────────────────────────────────────────
  const isMobile = typeof navigator !== 'undefined' && !!navigator.share;

  // ─── Shared UI pieces ─────────────────────────────────────────────────────

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
        cursor: 'pointer', marginBottom: '0.75rem',
      }}>
      {copied === 'link' ? '✅ Copied!' : '📋 Copy Arena Link'}
    </button>
  );

  // Main share button — native sheet on mobile, copy on desktop
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

  // Platform grid — desktop fallback buttons
  const platformGrid = (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '0.5rem', marginBottom: '0.75rem',
    }}>
      {SHARE_PLATFORMS.map(p => (
        <button
          key={p.key}
          onClick={() => handleShare(p.key)}
          style={{
            background: `${p.color}15`,
            border: `1px solid ${p.color}30`,
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
        <div style={{
          fontSize: '0.7rem', color: '#555', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem',
        }}>
          🔗 Share Arena
        </div>

        {urlBox}
        {mainShareBtn}

        {/* Desktop only — show platform buttons */}
        {!isMobile && (
          <>
            <div style={{ fontSize: '0.65rem', color: '#444', marginBottom: '0.5rem', textAlign: 'center' }}>
              or share directly to:
            </div>
            {platformGrid}
          </>
        )}

        {copyBtn}
        {sessionCount}
      </div>
    );
  }

  // ─── Super admin view ─────────────────────────────────────────────────────

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <div style={{
          fontSize: '0.7rem', color: '#555', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          🔗 Share Arena — Admin
        </div>
      </div>

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

      {/* Always show platform grid for admin — desktop control */}
      <div style={{
        fontSize: '0.7rem', color: '#555', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem',
      }}>
        Share via Platform
      </div>
      {platformGrid}
      {copyBtn}

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

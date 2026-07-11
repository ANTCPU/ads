'use client';
import { useState } from 'react';
import { ModuleContext } from '../types';
import { PLATFORMS, getShareAction, ShareContext } from '../../lib/socialShare';
import { notifyDiscord } from '../../lib/discord';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareModule({ slug, user, ads, isSuper }: ModuleContext) {
  const [copied, setCopied]     = useState<string | null>(null);
  const [shareCount, setShareCount] = useState(0);

  const arenaUrl    = `https://antcpu-ads.vercel.app/arena/${slug}`;
  const topAd       = ads[0] || null;
  const totalShares = ads.reduce((sum, a) => sum + (a.share_count || 0), 0);
  const totalClicks = ads.reduce((sum, a) => sum + (a.click_count || 0), 0);
  const totalPoints = ads.reduce((sum, a) => sum + (a.points     || 0), 0);

  // — build share context from top ad or arena fallback
  const ctx: ShareContext = topAd ? {
    brand:       topAd.brand,
    title:       topAd.title,
    description: topAd.description,
    url:         arenaUrl,
    profileUrl:  topAd.email
      ? `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(topAd.email)}`
      : arenaUrl,
    category:    topAd.category || 'Other',
    country:     undefined,
    isChampion:  false,
  } : {
    brand:       slug,
    title:       `${slug} Arena`,
    description: `Check out the ${slug} Arena on ANTCPU ADS`,
    url:         arenaUrl,
    profileUrl:  arenaUrl,
    category:    'Other',
  };

  async function handlePlatformShare(platformKey: string) {
    const platform = PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;

    const { url: intentUrl, text } = getShareAction(platform, ctx);

    if (intentUrl) {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    } else {
      try { await navigator.clipboard.writeText(text); } catch {}
      setCopied(platformKey);
      setTimeout(() => setCopied(null), 2000);
    }

    setShareCount(c => c + 1);
    notifyDiscord(
      `↗ **Arena Shared** — ${slug} via ${platform.label}\n` +
      `**By:** ${user.email || 'visitor'}\n` +
      `**URL:** ${arenaUrl}`
    );
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(arenaUrl); } catch {}
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  }

  // ─── User view ──────────────────────────────────────────────────────────

  if (!isSuper) {
    return (
      <div>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          🔗 Share Arena
        </div>

        {/* Arena URL */}
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.72rem', color: '#555', marginBottom: '0.75rem', wordBreak: 'break-all' }}>
          {arenaUrl}
        </div>

        {/* Copy link */}
        <button
          onClick={copyLink}
          style={{ width: '100%', background: copied === 'link' ? '#22c55e' : '#f0883e', border: 'none', color: '#000', borderRadius: '8px', padding: '0.6rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.75rem' }}
        >
          {copied === 'link' ? '✅ Copied!' : '📋 Copy Arena Link'}
        </button>

        {/* Platform grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              onClick={() => handlePlatformShare(p.key)}
              style={{ background: `${p.color}15`, border: `1px solid ${p.color}30`, borderRadius: '8px', padding: '0.6rem 0.25rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}
            >
              <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
              <span style={{ fontSize: '0.62rem', color: '#aaa', fontWeight: 600 }}>
                {copied === p.key ? '✓ Copied' : p.label}
              </span>
            </button>
          ))}
        </div>

        {shareCount > 0 && (
          <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '0.5rem', textAlign: 'center' }}>
            ↗ {shareCount} share{shareCount !== 1 ? 's' : ''} this session
          </div>
        )}
      </div>
    );
  }

  // ─── Super admin view ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🔗 Share Arena — Admin
        </div>
      </div>

      {/* Arena stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total Shares', value: totalShares, color: '#22c55e' },
          { label: 'Total Clicks', value: totalClicks, color: '#0070f3' },
          { label: 'Total Points', value: totalPoints, color: '#f0883e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.6rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.62rem', color: '#555', marginTop: '0.15rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Arena URL */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.72rem', color: '#555', marginBottom: '0.75rem', wordBreak: 'break-all' }}>
        {arenaUrl}
      </div>

      {/* Copy link */}
      <button
        onClick={copyLink}
        style={{ width: '100%', background: copied === 'link' ? '#22c55e' : '#f0883e', border: 'none', color: '#000', borderRadius: '8px', padding: '0.6rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', marginBottom: '1rem' }}
      >
        {copied === 'link' ? '✅ Copied!' : '📋 Copy Arena Link'}
      </button>

      {/* Platform grid — full */}
      <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        Share via Platform
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        {PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => handlePlatformShare(p.key)}
            style={{ background: `${p.color}15`, border: `1px solid ${p.color}30`, borderRadius: '8px', padding: '0.65rem 0.25rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}
          >
            <span style={{ fontSize: '1.3rem' }}>{p.icon}</span>
            <span style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 600 }}>
              {copied === p.key ? '✓ Copied' : p.label}
            </span>
            {!p.supportsIntent && (
              <span style={{ fontSize: '0.58rem', color: '#333' }}>copy</span>
            )}
          </button>
        ))}
      </div>

      {/* Per-ad share breakdown */}
      {ads.length > 0 && (
        <>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Per-Ad Share Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {[...ads].sort((a, b) => (b.share_count || 0) - (a.share_count || 0)).slice(0, 8).map(ad => (
              <div key={ad.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.title}</div>
                  <div style={{ fontSize: '0.65rem', color: '#555' }}>{ad.brand}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>↗ {ad.share_count || 0}</div>
                  <div style={{ fontSize: '0.65rem', color: '#555' }}>👆 {ad.click_count || 0}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {shareCount > 0 && (
        <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '0.75rem', textAlign: 'center' }}>
          ↗ {shareCount} share{shareCount !== 1 ? 's' : ''} this session
        </div>
      )}
    </div>
  );
}

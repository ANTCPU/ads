'use client';
// app/modules/tv/index.tsx
// ─── TV & Media Module ────────────────────────────────────────────────────────
//
// Unified module — replaces video-feed + youtube-live.
//
// THREE TABS:
//
//   🎨 Media
//     — Gallery of ads with image_url (2-col grid)
//     — Lightbox on click
//     — Admin: pin/unpin, remove image, image readiness bar
//
//   📡 Live
//     — Brand's TV studio — create or access existing
//     — Go Live button → opens /tv/[roomId]?mode=broadcast in new tab
//     — Watch link + share
//     — Links to /tv for full room browser
//
//   ▶️ YouTube
//     — Absorbed from youtube-live module
//     — Channel connect flow (saved to arena_modules)
//     — Live stream embed when configured
//     — Uses context supabase client (fixes the module-level client bug)
//
// v1 (Sep 2026) — new module, replaces video-feed + youtube-live
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { ModuleContext, Ad }   from '../types';
import { YOUTUBE_CHANNELS }    from '../../lib/platforms/youtube';

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
  purple:  '#7928ca',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
  sub:     '#888',
};

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

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'media' | 'live' | 'youtube';

type Studio = {
  id:         string;
  brand_name: string;
  room_id:    string;
  emoji:      string;
  studio_url: string;
  watch_url:  string;
};

type ChannelConfig = {
  channelId: string;
  handle:    string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TVModule({ slug, ads, supabase, user, isSuper }: ModuleContext) {

  const [tab, setTab] = useState<Tab>('media');

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text, marginBottom: '1.25rem' }}>
        📺 TV & Media
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem' }}>
        {([
          { key: 'media',   icon: '🎨', label: 'Media'   },
          { key: 'live',    icon: '📡', label: 'Live'     },
          { key: 'youtube', icon: '▶️', label: 'YouTube'  },
        ] as { key: Tab; icon: string; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background:   tab === t.key ? C.orange : 'transparent',
              border:       `1px solid ${tab === t.key ? C.orange : C.border2}`,
              borderRadius: '8px',
              color:        tab === t.key ? '#000' : C.muted,
              fontWeight:   tab === t.key ? 700 : 400,
              fontSize:     '0.78rem',
              padding:      '0.4rem 0.85rem',
              cursor:       'pointer',
              transition:   'all 0.15s',
              display:      'flex',
              alignItems:   'center',
              gap:          '0.3rem',
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'media'   && <MediaTab   ads={ads} supabase={supabase} user={user} isSuper={isSuper} slug={slug} />}
      {tab === 'live'    && <LiveTab    user={user} slug={slug} />}
      {tab === 'youtube' && <YouTubeTab slug={slug} user={user} supabase={supabase} />}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MEDIA TAB
// ══════════════════════════════════════════════════════════════════════════════

function MediaTab({ ads, supabase, user, isSuper, slug }: {
  ads:      Ad[];
  supabase: ModuleContext['supabase'];
  user:     ModuleContext['user'];
  isSuper?: boolean;
  slug:     string;
}) {
  const [localAds,  setLocalAds]  = useState<Ad[]>(ads);
  const [lightbox,  setLightbox]  = useState<Ad | null>(null);
  const [removing,  setRemoving]  = useState<string | null>(null);
  const [pinning,   setPinning]   = useState<string | null>(null);

  const brandName     = user.brand || slug;
  const allMedia      = localAds.filter(a => a.image_url && a.status === 'active');
  const brandMedia    = allMedia.filter(a =>
    a.brand?.toLowerCase().includes(brandName.toLowerCase())
  );
  const displayMedia  = isSuper ? allMedia : brandMedia;
  const withoutImages = localAds
    .filter(a => a.status === 'active' && !a.image_url &&
      a.brand?.toLowerCase().includes(brandName.toLowerCase())
    );

  async function removeImage(adId: string) {
    setRemoving(adId);
    await supabase.from('ads').update({ image_url: null }).eq('id', adId);
    setLocalAds(prev => prev.map(a => a.id === adId ? { ...a, image_url: undefined } : a));
    setRemoving(null);
  }

  async function togglePin(ad: Ad) {
    setPinning(ad.id);
    await supabase.from('ads').update({ pinned: !ad.pinned }).eq('id', ad.id);
    setLocalAds(prev => prev.map(a => a.id === ad.id ? { ...a, pinned: !a.pinned } : a));
    setPinning(null);
  }

  return (
    <div>
      {/* Admin readiness bar */}
      {isSuper && localAds.length > 0 && (
        <div style={{
          background:   C.bg,
          border:       `1px solid ${C.border}`,
          borderRadius: '8px',
          padding:      '0.65rem 0.85rem',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: C.muted, marginBottom: '0.3rem' }}>
            <span>Image readiness</span>
            <span style={{ color: C.orange, fontWeight: 700 }}>
              {allMedia.length}/{localAds.filter(a => a.status === 'active').length} ads
            </span>
          </div>
          <div style={{ height: '4px', background: C.border, borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height:     '100%',
              width:      `${localAds.filter(a => a.status === 'active').length > 0
                ? (allMedia.length / localAds.filter(a => a.status === 'active').length) * 100
                : 0}%`,
              background:   C.orange,
              borderRadius: '999px',
              transition:   'width 0.3s',
            }} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {displayMedia.length === 0 && (
        <div style={{
          background:   C.bg,
          border:       `1px solid ${C.border}`,
          borderRadius: '12px',
          padding:      '2rem',
          textAlign:    'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎨</div>
          <div style={{ fontSize: '0.85rem', color: C.sub, marginBottom: '0.4rem', fontWeight: 600 }}>
            No media yet
          </div>
          <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.6 }}>
            Use the Media module to generate AI images for your ads.
          </div>
        </div>
      )}

      {/* Gallery grid */}
      {displayMedia.length > 0 && (
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap:                 '0.65rem',
          marginBottom:        '1rem',
        }}>
          {displayMedia.map(ad => {
            const tierColor = TIER_COLOR[ad.tier || 'entry'] || C.blue;
            const tierLabel = TIER_LABEL[ad.tier || 'entry'] || 'Entry';

            return (
              <div
                key={ad.id}
                style={{
                  background:   C.card,
                  border:       `1px solid ${ad.pinned ? C.orange + '40' : C.border}`,
                  borderRadius: '10px',
                  overflow:     'hidden',
                  position:     'relative',
                }}
              >
                {/* Image */}
                <div
                  onClick={() => setLightbox(ad)}
                  style={{
                    width:         '100%',
                    paddingBottom: '100%',
                    position:      'relative',
                    cursor:        'pointer',
                    overflow:      'hidden',
                    background:    C.card2,
                  }}
                >
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    style={{
                      position:   'absolute',
                      top: 0, left: 0,
                      width:      '100%',
                      height:     '100%',
                      objectFit:  'cover',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                  {/* Tier badge */}
                  <span style={{
                    position:     'absolute',
                    top:          '0.35rem',
                    left:         '0.35rem',
                    fontSize:     '0.55rem',
                    fontWeight:   700,
                    color:        tierColor,
                    background:   `${C.bg}cc`,
                    border:       `1px solid ${tierColor}40`,
                    borderRadius: '999px',
                    padding:      '0.1rem 0.35rem',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {tierLabel}
                  </span>
                  {/* Points */}
                  <span style={{
                    position:     'absolute',
                    top:          '0.35rem',
                    right:        '0.35rem',
                    fontSize:     '0.55rem',
                    fontWeight:   700,
                    color:        C.orange,
                    background:   `${C.bg}cc`,
                    border:       `1px solid ${C.orange}30`,
                    borderRadius: '999px',
                    padding:      '0.1rem 0.35rem',
                    backdropFilter: 'blur(4px)',
                  }}>
                    ⚡{ad.points || 0}
                  </span>
                  {/* Pinned */}
                  {ad.pinned && (
                    <span style={{
                      position:     'absolute',
                      bottom:       '0.35rem',
                      left:         '0.35rem',
                      fontSize:     '0.7rem',
                    }}>
                      📌
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '0.5rem 0.6rem' }}>
                  <div style={{
                    fontSize:     '0.75rem',
                    fontWeight:   700,
                    color:        C.text,
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                    marginBottom: '0.2rem',
                  }}>
                    {ad.title}
                  </div>
                  {isSuper && (
                    <div style={{ fontSize: '0.62rem', color: C.muted }}>
                      {ad.brand}
                    </div>
                  )}
                </div>

                {/* Admin actions */}
                {isSuper && (
                  <div style={{
                    display:    'flex',
                    gap:        '0.3rem',
                    padding:    '0 0.6rem 0.6rem',
                  }}>
                    <button
                      onClick={() => togglePin(ad)}
                      disabled={pinning === ad.id}
                      style={{
                        flex:         1,
                        background:   ad.pinned ? `${C.orange}15` : 'transparent',
                        border:       `1px solid ${ad.pinned ? C.orange : C.border2}`,
                        color:        ad.pinned ? C.orange : C.muted,
                        borderRadius: '5px',
                        fontSize:     '0.6rem',
                        fontWeight:   700,
                        padding:      '0.2rem',
                        cursor:       'pointer',
                      }}
                    >
                      {pinning === ad.id ? '…' : ad.pinned ? '📌 Unpin' : '+ Pin'}
                    </button>
                    <button
                      onClick={() => removeImage(ad.id)}
                      disabled={removing === ad.id}
                      style={{
                        background:   `${C.red}10`,
                        border:       `1px solid ${C.red}30`,
                        color:        C.red,
                        borderRadius: '5px',
                        fontSize:     '0.6rem',
                        padding:      '0.2rem 0.4rem',
                        cursor:       'pointer',
                      }}
                    >
                      {removing === ad.id ? '…' : '✕'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <>
          <div
            onClick={() => setLightbox(null)}
            style={{
              position:   'fixed',
              inset:      0,
              background: 'rgba(0,0,0,0.9)',
              zIndex:     500,
            }}
          />
          <div style={{
            position:  'fixed',
            top:       '50%',
            left:      '50%',
            transform: 'translate(-50%,-50%)',
            zIndex:    501,
            width:     'min(90vw,420px)',
          }}>
            <img
              src={lightbox.image_url}
              alt={lightbox.title}
              style={{ width: '100%', borderRadius: '12px', display: 'block', marginBottom: '0.75rem' }}
            />
            <div style={{
              background:   C.card,
              border:       `1px solid ${C.border}`,
              borderRadius: '10px',
              padding:      '0.85rem 1rem',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: C.text, marginBottom: '0.35rem' }}>
                {lightbox.title}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: C.muted, marginBottom: '0.65rem' }}>
                <span style={{ color: C.orange, fontWeight: 700 }}>⚡ {lightbox.points || 0}</span>
                {(lightbox.click_count    || 0) > 0 && <span>👆 {lightbox.click_count}</span>}
                {(lightbox.share_count    || 0) > 0 && <span>↗ {lightbox.share_count}</span>}
                {(lightbox.reaction_count || 0) > 0 && <span>🔥 {lightbox.reaction_count}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={lightbox.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex:           1,
                    display:        'block',
                    textAlign:      'center',
                    background:     C.orange,
                    color:          '#000',
                    borderRadius:   '8px',
                    padding:        '0.55rem',
                    fontSize:       '0.82rem',
                    fontWeight:     700,
                    textDecoration: 'none',
                  }}
                >
                  View Ad →
                </a>
                <button
                  onClick={() => setLightbox(null)}
                  style={{
                    background:   'transparent',
                    border:       `1px solid ${C.border2}`,
                    color:        C.muted,
                    borderRadius: '8px',
                    padding:      '0.55rem 0.85rem',
                    cursor:       'pointer',
                    fontSize:     '0.82rem',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE TAB
// ══════════════════════════════════════════════════════════════════════════════

function LiveTab({ user, slug }: {
  user: ModuleContext['user'];
  slug: string;
}) {
  const [studio,   setStudio]   = useState<Studio | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const brandName = user.brand || slug;

  // Load existing studio for this brand
  useEffect(() => {
    fetch(`/api/tv/rooms?brand=${encodeURIComponent(brandName)}`)
      .then(r => r.json())
      .then(data => {
        const match = (data.studios || []).find((s: Studio) =>
          s.brand_name.toLowerCase() === brandName.toLowerCase()
        );
        setStudio(match || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [brandName]);

  async function createStudio() {
    if (creating) return;
    setCreating(true);
    try {
      const res  = await fetch('/api/tv/rooms', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brand_name: brandName }),
      });
      const data = await res.json();
      if (data.studio) setStudio(data.studio);
    } catch {}
    setCreating(false);
  }

  function copyWatchLink() {
    if (!studio) return;
    navigator.clipboard.writeText(studio.watch_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (loading) return (
    <div style={{ color: C.muted, fontSize: '0.82rem' }}>Loading...</div>
  );

  // No studio yet
  if (!studio) return (
    <div>
      <div style={{
        background:   `${C.red}08`,
        border:       `1px solid ${C.red}20`,
        borderRadius: '10px',
        padding:      '1.25rem',
        marginBottom: '1rem',
        textAlign:    'center',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📡</div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text, marginBottom: '0.3rem' }}>
          No studio yet
        </div>
        <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Create your studio to go live. One studio per brand —
          screen share, camera, or mic. No installs needed.
        </div>
        <button
          onClick={createStudio}
          disabled={creating}
          style={{
            background:   creating ? C.border : C.red,
            border:       'none',
            color:        '#fff',
            borderRadius: '8px',
            padding:      '0.65rem 1.5rem',
            fontSize:     '0.88rem',
            fontWeight:   700,
            cursor:       creating ? 'not-allowed' : 'pointer',
          }}
        >
          {creating ? '⚡ Creating...' : '📡 Create Studio'}
        </button>
      </div>

      <a
        href="/tv"
        style={{
          display:        'block',
          textAlign:      'center',
          fontSize:       '0.75rem',
          color:          C.muted,
          textDecoration: 'none',
        }}
      >
        Browse all studios →
      </a>
    </div>
  );

  // Studio exists
  return (
    <div>
      {/* Studio card */}
      <div style={{
        background:   C.bg,
        border:       `1px solid ${C.red}30`,
        borderLeft:   `3px solid ${C.red}`,
        borderRadius: '10px',
        padding:      '1rem',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{studio.emoji || '⚡'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: C.text }}>
              {studio.brand_name}
            </div>
            <div style={{ fontSize: '0.62rem', color: C.dim, fontFamily: 'monospace' }}>
              {studio.room_id}
            </div>
          </div>
          <span style={{
            fontSize:     '0.62rem',
            color:        C.green,
            background:   `${C.green}15`,
            border:       `1px solid ${C.green}30`,
            borderRadius: '999px',
            padding:      '0.1rem 0.45rem',
            fontWeight:   700,
          }}>
            ● Ready
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a
            href={`/tv/${studio.room_id}?mode=broadcast`}
            target="_blank"
            rel="noreferrer"
            style={{
              flex:           1,
              display:        'block',
              textAlign:      'center',
              background:     C.red,
              color:          '#fff',
              borderRadius:   '8px',
              padding:        '0.65rem',
              fontSize:       '0.85rem',
              fontWeight:     700,
              textDecoration: 'none',
              whiteSpace:     'nowrap',
            }}
          >
            ● Go Live
          </a>
          <a
            href={`/tv/${studio.room_id}?mode=watch`}
            target="_blank"
            rel="noreferrer"
            style={{
              flex:           1,
              display:        'block',
              textAlign:      'center',
              background:     'transparent',
              border:         `1px solid ${C.border2}`,
              color:          C.sub,
              borderRadius:   '8px',
              padding:        '0.65rem',
              fontSize:       '0.85rem',
              fontWeight:     700,
              textDecoration: 'none',
              whiteSpace:     'nowrap',
            }}
          >
            👁 Watch
          </a>
          <button
            onClick={copyWatchLink}
            style={{
              background:   copied ? `${C.green}15` : 'transparent',
              border:       `1px solid ${copied ? C.green : C.border2}`,
              color:        copied ? C.green : C.muted,
              borderRadius: '8px',
              padding:      '0.65rem 0.85rem',
              fontSize:     '0.82rem',
              fontWeight:   700,
              cursor:       'pointer',
              transition:   'all 0.15s',
              whiteSpace:   'nowrap',
            }}
          >
            {copied ? '✅' : '↗'}
          </button>
        </div>
      </div>

      {/* Watch URL */}
      <div style={{
        background:   C.card,
        border:       `1px solid ${C.border}`,
        borderRadius: '8px',
        padding:      '0.6rem 0.85rem',
        fontSize:     '0.68rem',
        color:        C.muted,
        marginBottom: '0.75rem',
        display:      'flex',
        alignItems:   'center',
        gap:          '0.5rem',
      }}>
        <span style={{ flexShrink: 0 }}>Watch:</span>
        <span style={{
          color:        C.orange,
          fontFamily:   'monospace',
          flex:         1,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          {studio.watch_url}
        </span>
      </div>

      <a
        href="/tv"
        style={{
          display:        'block',
          textAlign:      'center',
          fontSize:       '0.72rem',
          color:          C.muted,
          textDecoration: 'none',
        }}
      >
        📡 Browse all studios →
      </a>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// YOUTUBE TAB
// ══════════════════════════════════════════════════════════════════════════════

function YouTubeTab({ slug, user, supabase }: {
  slug:     string;
  user:     ModuleContext['user'];
  supabase: ModuleContext['supabase'];
}) {
  const [channel,     setChannel]     = useState<ChannelConfig | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [setup,       setSetup]       = useState(false);
  const [inputId,     setInputId]     = useState('');
  const [inputHandle, setInputHandle] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // Load channel config — hardcoded registry first, then arena_modules
  useEffect(() => {
    async function init() {
      // 1. Hardcoded registry
      const hardcoded = YOUTUBE_CHANNELS[slug];
      if (hardcoded && !hardcoded.channelId.includes('xxx')) {
        setChannel(hardcoded);
        setLoading(false);
        return;
      }
      // 2. Saved config in arena_modules
      if (user.email) {
        const { data } = await supabase
          .from('arena_modules')
          .select('config')
          .eq('slug', slug)
          .eq('email', user.email)
          .maybeSingle();
        const cfg = data?.config as Record<string, ChannelConfig> | null;
        if (cfg?.['youtube-live']) {
          setChannel(cfg['youtube-live']);
          setLoading(false);
          return;
        }
      }
      setLoading(false);
    }
    init();
  }, [slug, user.email, supabase]);

  async function saveChannel() {
    setError('');
    const id     = inputId.trim();
    const handle = inputHandle.trim().replace('@', '');

    if (!id || !handle) {
      setError('Both Channel ID and handle are required.');
      return;
    }
    if (!id.startsWith('UC') || id.length < 20) {
      setError('Channel ID should start with UC and be ~24 characters. Find it in YouTube Studio → Settings → Channel → Advanced.');
      return;
    }

    setSaving(true);

    // Read existing config to avoid overwriting other module configs
    const { data: existing } = await supabase
      .from('arena_modules')
      .select('config')
      .eq('slug', slug)
      .eq('email', user.email)
      .maybeSingle();

    const prev    = (existing?.config as Record<string, unknown>) || {};
    const updated = { ...prev, 'youtube-live': { channelId: id, handle: `@${handle}` } };

    await supabase
      .from('arena_modules')
      .upsert(
        { slug, email: user.email, config: updated, updated_at: new Date().toISOString() },
        { onConflict: 'slug,email' }
      );

    setChannel({ channelId: id, handle: `@${handle}` });
    setSetup(false);
    setSaving(false);
  }

  if (loading) return (
    <div style={{ color: C.muted, fontSize: '0.82rem' }}>Loading...</div>
  );

  // Setup flow
  if (!channel || setup) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.2rem' }}>▶️</span>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>
          Connect YouTube Channel
        </span>
      </div>

      <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem', lineHeight: 1.7 }}>
        1. Go to <strong style={{ color: C.sub }}>YouTube Studio</strong><br />
        2. Settings → Channel → Advanced settings<br />
        3. Copy your <strong style={{ color: C.sub }}>Channel ID</strong> (starts with UC...)<br />
        4. Paste below with your handle
      </div>

      {/* Channel ID */}
      <label style={{
        display:       'block',
        fontSize:      '0.65rem',
        color:         C.muted,
        fontWeight:    700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom:  '0.3rem',
      }}>
        Channel ID
      </label>
      <input
        value={inputId}
        onChange={e => setInputId(e.target.value)}
        placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxxx"
        style={{
          width:        '100%',
          background:   C.card,
          border:       `1px solid ${C.border2}`,
          borderRadius: '8px',
          padding:      '0.65rem 0.85rem',
          color:        C.text,
          fontSize:     '0.82rem',
          boxSizing:    'border-box',
          marginBottom: '0.75rem',
          outline:      'none',
          fontFamily:   'monospace',
        }}
      />

      {/* Handle */}
      <label style={{
        display:       'block',
        fontSize:      '0.65rem',
        color:         C.muted,
        fontWeight:    700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom:  '0.3rem',
      }}>
        YouTube Handle
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
        <span style={{ color: C.muted, fontSize: '0.9rem', flexShrink: 0 }}>@</span>
        <input
          value={inputHandle}
          onChange={e => setInputHandle(e.target.value.replace('@', ''))}
          placeholder="yourchannel"
          style={{
            flex:         1,
            background:   C.card,
            border:       `1px solid ${C.border2}`,
            borderRadius: '8px',
            padding:      '0.65rem 0.85rem',
            color:        C.text,
            fontSize:     '0.82rem',
            boxSizing:    'border-box',
            outline:      'none',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          fontSize:     '0.75rem',
          color:        C.red,
          marginBottom: '0.75rem',
          lineHeight:   1.5,
        }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={saveChannel}
          disabled={saving || !inputId.trim() || !inputHandle.trim()}
          style={{
            flex:         1,
            background:   saving || !inputId.trim() || !inputHandle.trim() ? C.border : '#FF0000',
            border:       'none',
            color:        '#fff',
            borderRadius: '8px',
            padding:      '0.65rem',
            fontSize:     '0.85rem',
            fontWeight:   700,
            cursor:       saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : '▶️ Connect Channel'}
        </button>
        {setup && channel && (
          <button
            onClick={() => { setSetup(false); setError(''); }}
            style={{
              background:   'transparent',
              border:       `1px solid ${C.border2}`,
              color:        C.muted,
              borderRadius: '8px',
              padding:      '0.65rem 1rem',
              fontSize:     '0.82rem',
              cursor:       'pointer',
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Test link */}
      {inputId.startsWith('UC') && inputId.length >= 20 && (
        <a
          href={`https://www.youtube.com/channel/${inputId}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display:        'block',
            marginTop:      '0.75rem',
            fontSize:       '0.72rem',
            color:          '#FF0000',
            textDecoration: 'none',
          }}
        >
          ▶️ Test this channel ID →
        </a>
      )}
    </div>
  );

  // Live embed
  return (
    <div>
      {/* 16:9 embed */}
      <div style={{
        position:      'relative',
        paddingBottom: '56.25%',
        height:        0,
        overflow:      'hidden',
        borderRadius:  '10px',
        marginBottom:  '0.75rem',
        border:        `1px solid ${C.border}`,
      }}>
        <iframe
          src={`https://www.youtube.com/embed/live_stream?channel=${channel.channelId}&autoplay=0&rel=0`}
          title={`${channel.handle} Live`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position:     'absolute',
            top: 0, left: 0,
            width:        '100%',
            height:       '100%',
            border:       'none',
            borderRadius: '10px',
          }}
        />
      </div>

      {/* Footer row */}
      <div style={{
        display:     'flex',
        alignItems:  'center',
        gap:         '0.5rem',
        flexWrap:    'wrap',
      }}>
        <span style={{
          width:        '7px',
          height:       '7px',
          borderRadius: '50%',
          background:   '#FF0000',
          display:      'inline-block',
          flexShrink:   0,
        }} />
        <span style={{ fontSize: '0.72rem', color: C.muted, flex: 1 }}>
          Live when streaming · {channel.handle}
        </span>
        <a
          href={`https://www.youtube.com/${channel.handle}`}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize:       '0.72rem',
            color:          '#FF0000',
            textDecoration: 'none',
            fontWeight:     700,
          }}
        >
          ▶️ YouTube →
        </a>
        <button
          onClick={() => {
            setSetup(true);
            setInputId(channel.channelId);
            setInputHandle(channel.handle.replace('@', ''));
          }}
          style={{
            background: 'none',
            border:     'none',
            color:      C.dim,
            cursor:     'pointer',
            fontSize:   '0.72rem',
            padding:    0,
          }}
        >
          ✏️
        </button>
      </div>
    </div>
  );
}

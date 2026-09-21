'use client';
// app/modules/media/index.tsx
// ─── Media Module ─────────────────────────────────────────────────────────────
//
// Brand media management — ad images, AI generation, upload to ads table.
//
// USER VIEW:
//   — Gallery of all active ads that have image_url set
//   — Each card: image, ad title, tier badge, points
//   — Empty state: prompt to generate first image
//   — AI Generate tab: prompt → /api/ads-image → preview → attach to ad
//
// ADMIN VIEW:
//   — Same gallery + generate
//   — Per-image: attach to any ad, remove image_url, rescore
//   — Network media stats: total images, ads without images
//   — Bulk: "Generate missing" — auto-generates for ads with no image_url
//
// Image source: Pollinations AI via /api/ads-image (Flux model, 1024×1024)
// Storage: base64 preview → saved as image_url on ads table via supabase update
// No Cloudinary dependency — direct URL storage
//
// v1 (Sep 2026) — new module
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { ModuleContext, Ad }   from '../types';

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function MediaModule({ slug, ads, supabase, user, isSuper }: ModuleContext) {

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'gallery' | 'generate'>('gallery');

  // ── Gallery state ─────────────────────────────────────────────────────────
  const [localAds,  setLocalAds]  = useState<Ad[]>(ads);
  const [removing,  setRemoving]  = useState<string | null>(null);
  const [lightbox,  setLightbox]  = useState<Ad | null>(null);

  // ── Generate state ────────────────────────────────────────────────────────
  const [prompt,      setPrompt]      = useState('');
  const [generating,  setGenerating]  = useState(false);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [selectedAd,  setSelectedAd]  = useState<string>('');
  const [attaching,   setAttaching]   = useState(false);
  const [attached,    setAttached]    = useState(false);

  // ── Bulk generate state (admin) ───────────────────────────────────────────
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDone,    setBulkDone]    = useState(0);

  // ── Derived ───────────────────────────────────────────────────────────────
  const brandName  = user.brand || slug;
  const brandAds   = localAds.filter(a =>
    a.brand?.toLowerCase().includes(brandName.toLowerCase()) &&
    a.status === 'active'
  );
  const withImages    = brandAds.filter(a => a.image_url);
  const withoutImages = brandAds.filter(a => !a.image_url);

  // ── Generate image ────────────────────────────────────────────────────────
  async function generateImage() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setPreview(null);
    setAttached(false);

    try {
      const res  = await fetch('/api/ads-image', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          prompt:   prompt.trim(),
          filename: `${brandName}-${Date.now()}.jpg`,
        }),
      });
      const data = await res.json();
      if (data.image) {
        setPreview(data.image);
        // Auto-select top ad if none selected
        if (!selectedAd && brandAds.length > 0) {
          setSelectedAd(brandAds[0].id);
        }
      }
    } catch {}
    setGenerating(false);
  }

  // ── Attach image to ad ────────────────────────────────────────────────────
  async function attachImage() {
    if (!preview || !selectedAd || attaching) return;
    setAttaching(true);

    await supabase
      .from('ads')
      .update({ image_url: preview })
      .eq('id', selectedAd);

    setLocalAds(prev => prev.map(a =>
      a.id === selectedAd ? { ...a, image_url: preview } : a
    ));

    setAttached(true);
    setPreview(null);
    setPrompt('');
    setSelectedAd('');
    setAttaching(false);
    setTab('gallery');
    setTimeout(() => setAttached(false), 3000);
  }

  // ── Remove image ──────────────────────────────────────────────────────────
  async function removeImage(adId: string) {
    setRemoving(adId);
    await supabase.from('ads').update({ image_url: null }).eq('id', adId);
    setLocalAds(prev => prev.map(a =>
      a.id === adId ? { ...a, image_url: undefined } : a
    ));
    setRemoving(null);
  }

  // ── Bulk generate missing ─────────────────────────────────────────────────
  async function bulkGenerate() {
    if (bulkRunning || withoutImages.length === 0) return;
    setBulkRunning(true);
    setBulkDone(0);

    for (const ad of withoutImages) {
      const autoPrompt = `${ad.title} — ${ad.description || ad.category} — professional brand advertisement, dark background, vibrant colors, modern design`;
      try {
        const res  = await fetch('/api/ads-image', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ prompt: autoPrompt }),
        });
        const data = await res.json();
        if (data.image) {
          await supabase.from('ads').update({ image_url: data.image }).eq('id', ad.id);
          setLocalAds(prev => prev.map(a =>
            a.id === ad.id ? { ...a, image_url: data.image } : a
          ));
          setBulkDone(n => n + 1);
        }
      } catch {}
    }
    setBulkRunning(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%' }}>

      {/* CSS */}
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes shimmer {
          0%{background-position:-200% 0}
          100%{background-position:200% 0}
        }
      `}</style>

      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   '1.25rem',
        flexWrap:       'wrap',
        gap:            '0.5rem',
      }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text }}>
          🎨 Media
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <span style={{
            fontSize: '0.68rem', color: C.green,
            background: `${C.green}15`, border: `1px solid ${C.green}25`,
            borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 700,
          }}>
            {withImages.length} with image
          </span>
          {withoutImages.length > 0 && (
            <span style={{
              fontSize: '0.68rem', color: C.muted,
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: '999px', padding: '0.15rem 0.5rem',
            }}>
              {withoutImages.length} missing
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {(['gallery', 'generate'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background:   tab === t ? C.orange : 'transparent',
              border:       `1px solid ${tab === t ? C.orange : C.border2}`,
              borderRadius: '8px',
              color:        tab === t ? '#000' : C.muted,
              fontWeight:   tab === t ? 700 : 400,
              fontSize:     '0.78rem',
              padding:      '0.4rem 0.85rem',
              cursor:       'pointer',
              transition:   'all 0.15s',
            }}
          >
            {t === 'gallery' ? '🖼️ Gallery' : '✨ Generate'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          GALLERY TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'gallery' && (
        <div>

          {/* Attached success toast */}
          {attached && (
            <div style={{
              background:   `${C.green}15`,
              border:       `1px solid ${C.green}30`,
              borderRadius: '8px',
              padding:      '0.5rem 0.85rem',
              fontSize:     '0.78rem',
              color:        C.green,
              fontWeight:   700,
              marginBottom: '0.85rem',
              animation:    'fadeIn 0.2s ease',
            }}>
              ✅ Image attached successfully
            </div>
          )}

          {/* Admin bulk generate */}
          {isSuper && withoutImages.length > 0 && (
            <div style={{
              background:   `${C.orange}08`,
              border:       `1px solid ${C.orange}25`,
              borderRadius: '10px',
              padding:      '0.85rem 1rem',
              marginBottom: '1rem',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
              gap:          '0.75rem',
              flexWrap:     'wrap',
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.orange, marginBottom: '0.15rem' }}>
                  {withoutImages.length} ads missing images
                </div>
                <div style={{ fontSize: '0.72rem', color: C.sub }}>
                  Auto-generate using ad title + description as prompt
                </div>
              </div>
              <button
                onClick={bulkGenerate}
                disabled={bulkRunning}
                style={{
                  background:   bulkRunning ? C.border : C.orange,
                  border:       'none',
                  color:        bulkRunning ? C.muted : '#000',
                  borderRadius: '8px',
                  padding:      '0.5rem 1rem',
                  fontSize:     '0.78rem',
                  fontWeight:   700,
                  cursor:       bulkRunning ? 'not-allowed' : 'pointer',
                  whiteSpace:   'nowrap',
                }}
              >
                {bulkRunning
                  ? `Generating ${bulkDone}/${withoutImages.length}...`
                  : `✨ Generate All ${withoutImages.length}`
                }
              </button>
            </div>
          )}

          {/* Empty state */}
          {withImages.length === 0 && (
            <div style={{
              background:   C.bg,
              border:       `1px solid ${C.border}`,
              borderRadius: '12px',
              padding:      '2rem',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎨</div>
              <div style={{ fontSize: '0.88rem', color: C.sub, marginBottom: '0.5rem', fontWeight: 600 }}>
                No images yet
              </div>
              <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Generate AI images for your ads — each image makes your ad stand out in the Arena feed.
              </div>
              <button
                onClick={() => setTab('generate')}
                style={{
                  background:   C.orange,
                  border:       'none',
                  color:        '#000',
                  borderRadius: '8px',
                  padding:      '0.6rem 1.25rem',
                  fontSize:     '0.85rem',
                  fontWeight:   700,
                  cursor:       'pointer',
                }}
              >
                ✨ Generate First Image →
              </button>
            </div>
          )}

          {/* Image gallery grid */}
          {withImages.length > 0 && (
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap:                 '0.65rem',
            }}>
              {withImages.map(ad => {
                const tier      = ad.tier || 'entry';
                const tierColor = TIER_COLOR[tier] || C.blue;
                const tierLabel = TIER_LABEL[tier] || 'Entry';

                return (
                  <div
                    key={ad.id}
                    style={{
                      background:   C.card,
                      border:       `1px solid ${C.border}`,
                      borderRadius: '10px',
                      overflow:     'hidden',
                      position:     'relative',
                    }}
                  >
                    {/* Image */}
                    <div
                      onClick={() => setLightbox(ad)}
                      style={{
                        width:           '100%',
                        paddingBottom:   '100%',
                        position:        'relative',
                        cursor:          'pointer',
                        overflow:        'hidden',
                        background:      C.card2,
                      }}
                    >
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        style={{
                          position:   'absolute',
                          top:        0, left: 0,
                          width:      '100%',
                          height:     '100%',
                          objectFit:  'cover',
                          transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      />

                      {/* Tier badge overlay */}
                      <span style={{
                        position:     'absolute',
                        top:          '0.4rem',
                        left:         '0.4rem',
                        fontSize:     '0.55rem',
                        fontWeight:   700,
                        color:        tierColor,
                        background:   `${C.bg}cc`,
                        border:       `1px solid ${tierColor}40`,
                        borderRadius: '999px',
                        padding:      '0.1rem 0.4rem',
                        backdropFilter: 'blur(4px)',
                      }}>
                        {tierLabel}
                      </span>

                      {/* Points overlay */}
                      <span style={{
                        position:     'absolute',
                        top:          '0.4rem',
                        right:        '0.4rem',
                        fontSize:     '0.55rem',
                        fontWeight:   700,
                        color:        C.orange,
                        background:   `${C.bg}cc`,
                        border:       `1px solid ${C.orange}30`,
                        borderRadius: '999px',
                        padding:      '0.1rem 0.4rem',
                        backdropFilter: 'blur(4px)',
                      }}>
                        ⚡ {ad.points || 0}
                      </span>
                    </div>

                    {/* Ad info */}
                    <div style={{ padding: '0.55rem 0.65rem' }}>
                      <div style={{
                        fontSize:     '0.78rem',
                        fontWeight:   700,
                        color:        C.text,
                        marginBottom: '0.2rem',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:   'nowrap',
                      }}>
                        {ad.title}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.62rem', color: C.muted }}>
                        {(ad.click_count || 0) > 0 && <span>👆 {ad.click_count}</span>}
                        {(ad.share_count || 0) > 0 && <span>↗ {ad.share_count}</span>}
                      </div>
                    </div>

                    {/* Admin remove button */}
                    {isSuper && (
                      <button
                        onClick={() => removeImage(ad.id)}
                        disabled={removing === ad.id}
                        style={{
                          position:     'absolute',
                          bottom:       '0.4rem',
                          right:        '0.4rem',
                          background:   `${C.red}20`,
                          border:       `1px solid ${C.red}40`,
                          borderRadius: '6px',
                          color:        C.red,
                          fontSize:     '0.6rem',
                          fontWeight:   700,
                          padding:      '0.15rem 0.4rem',
                          cursor:       removing === ad.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {removing === ad.id ? '…' : '✕'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Ads without images — admin list */}
          {isSuper && withoutImages.length > 0 && withImages.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                fontSize:      '0.65rem',
                color:         C.muted,
                fontWeight:    700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom:  '0.5rem',
              }}>
                No Image ({withoutImages.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {withoutImages.map(ad => (
                  <div key={ad.id} style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    padding:        '0.55rem 0.75rem',
                    background:     C.bg,
                    border:         `1px solid ${C.border}`,
                    borderRadius:   '8px',
                    gap:            '0.5rem',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ad.title}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: C.muted }}>
                        ⚡ {ad.points || 0} pts · {TIER_LABEL[ad.tier || 'entry']}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAd(ad.id);
                        setPrompt(`${ad.title} — ${ad.description || ad.category} — professional brand advertisement, dark background, vibrant colors`);
                        setTab('generate');
                      }}
                      style={{
                        background:   `${C.orange}15`,
                        border:       `1px solid ${C.orange}30`,
                        borderRadius: '6px',
                        color:        C.orange,
                        fontSize:     '0.68rem',
                        fontWeight:   700,
                        padding:      '0.25rem 0.6rem',
                        cursor:       'pointer',
                        whiteSpace:   'nowrap',
                      }}
                    >
                      ✨ Generate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          GENERATE TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'generate' && (
        <div>

          {/* How it works */}
          <div style={{
            background:   `${C.purple}08`,
            border:       `1px solid ${C.purple}25`,
            borderRadius: '10px',
            padding:      '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize:     '0.75rem',
            color:        C.sub,
            lineHeight:   1.6,
          }}>
            <span style={{ color: C.purple, fontWeight: 700 }}>✨ AI Image Generator — </span>
            Describe your ad image. The AI generates a 1024×1024 image using Flux.
            Then attach it to any of your active ads.
          </div>

          {/* Prompt input */}
          <label style={{
            fontSize:      '0.65rem',
            color:         C.muted,
            fontWeight:    700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display:       'block',
            marginBottom:  '0.3rem',
          }}>
            Image Prompt
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. A vibrant Nigerian market scene with Pi Network branding, dark background, orange accents, modern digital art style"
            rows={3}
            style={{
              width:        '100%',
              background:   C.card,
              border:       `1px solid ${C.border2}`,
              color:        C.text,
              borderRadius: '8px',
              padding:      '0.65rem 0.85rem',
              fontSize:     '0.82rem',
              resize:       'vertical',
              boxSizing:    'border-box',
              marginBottom: '0.75rem',
              lineHeight:   1.5,
              outline:      'none',
            }}
          />

          {/* Prompt suggestions */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            {[
              'dark background, vibrant colors, modern',
              'minimalist, professional, brand identity',
              'community, Pi Network, digital marketplace',
            ].map(s => (
              <button
                key={s}
                onClick={() => setPrompt(prev => prev ? `${prev}, ${s}` : s)}
                style={{
                  background:   C.bg,
                  border:       `1px solid ${C.border2}`,
                  borderRadius: '999px',
                  color:        C.muted,
                  fontSize:     '0.65rem',
                  padding:      '0.2rem 0.6rem',
                  cursor:       'pointer',
                }}
              >
                + {s}
              </button>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={generateImage}
            disabled={!prompt.trim() || generating}
            style={{
              width:        '100%',
              background:   prompt.trim() && !generating ? C.purple : C.border,
              border:       'none',
              color:        prompt.trim() && !generating ? '#fff' : C.muted,
              borderRadius: '8px',
              padding:      '0.75rem',
              fontSize:     '0.88rem',
              fontWeight:   700,
              cursor:       prompt.trim() && !generating ? 'pointer' : 'not-allowed',
              marginBottom: '1rem',
              transition:   'all 0.15s',
            }}
          >
            {generating ? '✨ Generating...' : '✨ Generate Image'}
          </button>

          {/* Generating shimmer placeholder */}
          {generating && (
            <div style={{
              width:           '100%',
              paddingBottom:   '100%',
              position:        'relative',
              borderRadius:    '10px',
              overflow:        'hidden',
              marginBottom:    '1rem',
              background:      `linear-gradient(90deg, ${C.card} 25%, ${C.card2} 50%, ${C.card} 75%)`,
              backgroundSize:  '200% 100%',
              animation:       'shimmer 1.5s infinite',
            }}>
              <div style={{
                position:   'absolute',
                inset:      0,
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap:        '0.5rem',
              }}>
                <div style={{ fontSize: '2rem' }}>✨</div>
                <div style={{ fontSize: '0.78rem', color: C.muted }}>Generating with Flux...</div>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && !generating && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{
                width:         '100%',
                paddingBottom: '100%',
                position:      'relative',
                borderRadius:  '10px',
                overflow:      'hidden',
                marginBottom:  '1rem',
                border:        `1px solid ${C.purple}40`,
              }}>
                <img
                  src={preview}
                  alt="Generated"
                  style={{
                    position:  'absolute',
                    top: 0, left: 0,
                    width:     '100%',
                    height:    '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>

              {/* Attach to ad */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{
                  fontSize:      '0.65rem',
                  color:         C.muted,
                  fontWeight:    700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display:       'block',
                  marginBottom:  '0.3rem',
                }}>
                  Attach to Ad
                </label>
                <select
                  value={selectedAd}
                  onChange={e => setSelectedAd(e.target.value)}
                  style={{
                    width:        '100%',
                    background:   C.card,
                    border:       `1px solid ${C.border2}`,
                    color:        selectedAd ? C.text : C.muted,
                    borderRadius: '8px',
                    padding:      '0.65rem 0.85rem',
                    fontSize:     '0.85rem',
                    boxSizing:    'border-box',
                  }}
                >
                  <option value="">Select an ad</option>
                  {brandAds.map(ad => (
                    <option key={ad.id} value={ad.id}>
                      {ad.title.slice(0, 45)}{ad.title.length > 45 ? '…' : ''} — ⚡{ad.points || 0}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={attachImage}
                  disabled={!selectedAd || attaching}
                  style={{
                    flex:         1,
                    background:   selectedAd && !attaching ? C.green : C.border,
                    border:       'none',
                    color:        selectedAd && !attaching ? '#000' : C.muted,
                    borderRadius: '8px',
                    padding:      '0.7rem',
                    fontSize:     '0.85rem',
                    fontWeight:   700,
                    cursor:       selectedAd && !attaching ? 'pointer' : 'not-allowed',
                  }}
                >
                  {attaching ? 'Attaching...' : '✅ Attach to Ad'}
                </button>
                <button
                  onClick={() => { setPreview(null); setPrompt(''); }}
                  style={{
                    background:   'transparent',
                    border:       `1px solid ${C.border2}`,
                    color:        C.muted,
                    borderRadius: '8px',
                    padding:      '0.7rem 1rem',
                    fontSize:     '0.82rem',
                    cursor:       'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LIGHTBOX
      ══════════════════════════════════════════════════════════════════ */}
      {lightbox && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setLightbox(null)}
            style={{
              position:   'fixed',
              inset:      0,
              background: 'rgba(0,0,0,0.88)',
              zIndex:     500,
              animation:  'fadeIn 0.2s ease',
            }}
          />

          {/* Lightbox content */}
          <div style={{
            position:      'fixed',
            top:           '50%',
            left:          '50%',
            transform:     'translate(-50%, -50%)',
            zIndex:        501,
            width:         'min(90vw, 480px)',
            animation:     'fadeIn 0.2s ease',
          }}>
            {/* Image */}
            <img
              src={lightbox.image_url}
              alt={lightbox.title}
              style={{
                width:        '100%',
                borderRadius: '12px',
                display:      'block',
                marginBottom: '0.75rem',
              }}
            />

            {/* Ad info card */}
            <div style={{
              background:   C.card,
              border:       `1px solid ${C.border}`,
              borderRadius: '10px',
              padding:      '0.85rem 1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize:     '0.6rem',
                  fontWeight:   700,
                  color:        TIER_COLOR[lightbox.tier || 'entry'],
                  background:   `${TIER_COLOR[lightbox.tier || 'entry']}15`,
                  border:       `1px solid ${TIER_COLOR[lightbox.tier || 'entry']}30`,
                  borderRadius: '999px',
                  padding:      '0.1rem 0.4rem',
                  textTransform: 'uppercase',
                }}>
                  {TIER_LABEL[lightbox.tier || 'entry']}
                </span>
                {lightbox.pinned && (
                  <span style={{ fontSize: '0.65rem', color: C.orange }}>📌 Pinned</span>
                )}
              </div>

              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: C.text, marginBottom: '0.4rem' }}>
                {lightbox.title}
              </div>

              {lightbox.description && (
                <div style={{ fontSize: '0.75rem', color: C.sub, lineHeight: 1.55, marginBottom: '0.5rem' }}>
                  {lightbox.description.slice(0, 100)}{lightbox.description.length > 100 ? '…' : ''}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: C.muted, marginBottom: '0.65rem' }}>
                <span style={{ color: C.orange, fontWeight: 700 }}>⚡ {lightbox.points || 0} pts</span>
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
                    fontSize:     '0.82rem',
                    cursor:       'pointer',
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

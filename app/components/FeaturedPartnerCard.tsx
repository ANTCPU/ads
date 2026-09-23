// app/components/FeaturedPartnerCard.tsx
// ─── Featured Partner Card ────────────────────────────────────────────────────
// Reads from /api/featured-profile — one source of truth.
// Used by: /arena, /dashboard/user, /mac, homepage.
// Rotates weekly with the featured-profile badge holder.
// Amanda Photography this week → Map of Pi / Philip next week.
//
// Season framing: "Featured Partner · Season 1"
// Motivator: "Top brands earn this spotlight."
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';

type FeaturedData = {
  email:      string;
  name:       string;
  brand:      string;
  points:     number;
  bio:        string;
  websiteUrl: string;
  adTitle:    string;
  adUrl:      string;
  adPoints:   number;
  rank:       number | null;
  imageUrl:   string | null;
  category:   string;
  color:      string;
  profileUrl: string;
};

type Props = {
  season?: string;  // e.g. 'Season 1' — shown in label
  compact?: boolean; // true = smaller version for dashboard/footer
  motivatorText?: string; 
};

export default function FeaturedPartnerCard({
  season  = 'Season 1',
  compact = false,
}: Props) {
  const router   = useRouter();
  const [data,    setData]    = useState<FeaturedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/featured-profile')
      .then(r => r.json())
      .then(j => { setData(j.featured || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data)   return null;

  const color    = data.color;
  const gradient = `linear-gradient(135deg, #0d0a10 0%, #1a0d18 100%)`;

  // ── Compact version — dashboard sidebar / footer ──────────────────────────
  if (compact) {
    return (
      <div style={{
        background:   '#111',
        border:       `1px solid ${color}30`,
        borderLeft:   `3px solid ${color}`,
        borderRadius: '10px',
        padding:      '0.85rem 1rem',
        marginBottom: '1rem',
        cursor:       'pointer',
      }}
        onClick={() => router.push(data.profileUrl)}
      >
        <div style={{
          fontSize:      '0.62rem',
          color:         color,
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom:  '0.4rem',
        }}>
          ⭐ Featured Partner · {season}
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginBottom: '0.2rem' }}>
          {data.brand}
        </div>
        {data.bio && (
          <div style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.4, marginBottom: '0.5rem' }}>
            {data.bio.slice(0, 80)}{data.bio.length > 80 ? '…' : ''}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#444' }}>
          {data.adPoints > 0 && <span style={{ color }}>⚡ {data.adPoints} pts</span>}
          {data.rank      && <span>#{data.rank} in Arena</span>}
        </div>
      </div>
    );
  }

  // ── Full version — arena + mac page ──────────────────────────────────────
  return (
    <div style={{
      background:    gradient,
      border:        `1px solid ${color}33`,
      borderRadius:  '16px',
      padding:       '1.5rem',
      marginBottom:  '1.5rem',
      position:      'relative',
      overflow:      'hidden',
    }}>

      {/* Top accent line */}
      <div style={{
        position:   'absolute',
        top:        0, left: 0, right: 0,
        height:     '3px',
        background: `linear-gradient(90deg, ${color}, #7928ca, transparent)`,
      }} />

      {/* Label */}
      <div style={{
        fontSize:      '0.65rem',
        color:         color,
        fontWeight:    700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom:  '1rem',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
      }}>
        <span>⭐ Featured Partner · {season}</span>
        <span style={{ color: '#333', fontWeight: 400, fontSize: '0.6rem' }}>
          Rotates weekly
        </span>
      </div>

      {/* Brand + image row */}
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        {data.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.imageUrl}
            alt={data.brand}
            style={{
              width:        52,
              height:       52,
              borderRadius: '10px',
              objectFit:    'cover',
              border:       `1px solid ${color}40`,
              flexShrink:   0,
            }}
            onError={e => {
              e.currentTarget.style.display = 'none';
              fetch('/api/image-error', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                  url:      e.currentTarget.src,
                  page:     'featured-partner-card',
                  property: 'arena',
                }),
              }).catch(() => {});
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', marginBottom: '0.15rem' }}>
            {data.brand}
          </div>
          <div style={{ fontSize: '0.75rem', color, fontWeight: 600, marginBottom: '0.4rem' }}>
            {data.name}
          </div>
          {data.bio && (
            <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.5, fontStyle: 'italic' }}>
              "{data.bio.slice(0, 100)}{data.bio.length > 100 ? '…' : ''}"
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {data.adPoints > 0 && (
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color }}>{data.adPoints}</div>
            <div style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Points</div>
          </div>
        )}
        {data.rank && (
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>#{data.rank}</div>
            <div style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rank</div>
          </div>
        )}
        {data.adTitle && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize:     '0.75rem',
              fontWeight:   700,
              color:        '#ccc',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {data.adTitle}
            </div>
            <div style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Ad</div>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
        <button
          onClick={() => router.push(data.profileUrl)}
          style={{
            background:   color,
            border:       'none',
            borderRadius: '8px',
            color:        '#000',
            fontWeight:   800,
            fontSize:     '0.82rem',
            padding:      '0.55rem 1.1rem',
            cursor:       'pointer',
          }}
        >
          👤 View Profile →
        </button>
        {data.adUrl && (
          <button
            onClick={() => window.open(data.adUrl, '_blank', 'noopener,noreferrer')}
            style={{
              background:   'transparent',
              border:       `1px solid ${color}50`,
              borderRadius: '8px',
              color,
              fontWeight:   700,
              fontSize:     '0.82rem',
              padding:      '0.55rem 1.1rem',
              cursor:       'pointer',
            }}
          >
            🔗 Visit Brand →
          </button>
        )}
      </div>

      {/* Motivator */}
      <div style={{ fontSize: '0.68rem', color: '#333', borderTop: '1px solid #1a1a1a', paddingTop: '0.65rem' }}>
      {motivatorText ?? 'Top brands earn this spotlight.'}
      </div>

    </div>
  );
}

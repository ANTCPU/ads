'use client';
// app/fall/FallClient.tsx
// ─── Fall 2026 Arena — Season 1 landing page ──────────────────────────────────
//
// Route: /fall
// Season: 1-fall2026 · Sep 22 → Dec 21 2026 · color #e85d04
//
// Sections:
//   1. Hero         — season badge, countdown, tagline, CTA
//   2. Stats bar    — live network stats from /api/stats
//   3. Top Countries — topCountries[] grid + SlidePanel overflow
//   4. Top Ads      — topAds[] from /api/stats, ranked
//   5. Top Brands   — topBrands[] from /api/stats
//   6. Featured     — FeaturedPartnerCard (season='Season 1')
//   7. Season map   — all seasons from seasons.ts, status badges
//   8. Join CTA     — enter the arena
//
// Data: single /api/stats fetch — no extra round trips
// Components: ArenaNav, ArenaFooter, LanguageSwitcher, FeaturedPartnerCard
// Seasons: imported from app/lib/seasons.ts — no hardcoded dates
//
// v1 (Sep 2026) — initial build
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect }           from 'react';
import { useRouter }                     from 'next/navigation';
import ArenaNav                          from '../components/ArenaNav';
import ArenaFooter                       from '../components/ArenaFooter';
import LanguageSwitcher                  from '../components/LanguageSwitcher';
import FeaturedPartnerCard               from '../components/FeaturedPartnerCard';
import { SEASONS, getSeasonStatus,
         daysUntilOpen, daysRemaining }  from '../lib/seasons';
import { getStoredLocale }               from '../lib/locale';
import { t }                             from '../lib/i18n/index';
import type { Locale }                   from '../lib/i18n/index';

// ─── Design tokens — Fall palette ─────────────────────────────────────────────
const FALL = {
  primary:  '#e85d04',   // burnt orange — season color from seasons.ts
  gold:     '#D4AF37',   // gold — featured / top
  amber:    '#f59e0b',   // amber — secondary accent
  bg:       '#0a0a0a',
  card:     '#111',
  border:   '#1a1a1a',
  border2:  '#222',
  muted:    '#555',
  muted2:   '#333',
  white:    '#fff',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type CountryRow = { country: string; count: number; flag: string; };
type TopAd      = {
  id: string; brand: string; points: number;
  rank_position?: number; reaction_count: number;
  share_count: number; click_count: number; pinned: boolean;
};
type TopBrand   = { brand: string; pts: number; slug: string; };

type Stats = {
  totalAds:       number;
  totalBrands:    number;
  totalCountries: number;
  totalPoints:    number;
  totalReactions: number;
  totalShares:    number;
  topCountries:   CountryRow[];
  allCountries:   CountryRow[];
  topAds:         TopAd[];
  topBrands:      TopBrand[];
};

// ─── Fall season — pulled from registry ───────────────────────────────────────
const FALL_SEASON = SEASONS.find(s => s.slug === '1-fall2026')!;

// ─── Component ────────────────────────────────────────────────────────────────
export default function FallClient() {
  const router = useRouter();

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale,  setLocale]  = useState<Locale>('en');
  const [now,     setNow]     = useState(new Date());

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLocale(getStoredLocale());
    fetch('/api/stats', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: Stats) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Live clock — updates countdown every minute ───────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Season derived values ─────────────────────────────────────────────────
  const seasonStatus  = getSeasonStatus(FALL_SEASON, now);
  const daysLeft      = daysRemaining(FALL_SEASON, now);
  const daysToOpen    = daysUntilOpen(FALL_SEASON, now);

  // ─── Render helpers ───────────────────────────────────────────────────────

  function StatPill({ value, label, color }: { value: string | number; label: string; color: string }) {
    return (
      <div style={{
        background:   FALL.card,
        border:       `1px solid ${FALL.border}`,
        borderRadius: '12px',
        padding:      '0.75rem 1rem',
        textAlign:    'center',
        flex:         1,
        minWidth:     '70px',
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: '0.62rem', color: FALL.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.15rem' }}>{label}</div>
      </div>
    );
  }

  function SectionLabel({ emoji, text }: { emoji: string; text: string }) {
    return (
      <div style={{
        fontSize:      '0.65rem',
        color:         FALL.muted,
        fontWeight:    700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom:  '1rem',
      }}>
        {emoji} {text}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: FALL.bg, color: FALL.white, fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role="user"
        userName=""
        userEmail=""
        userBrand=""
        trialStatus="trial"
        onLogout={() => {}}
      />

      {/* ── Top accent bar ── */}
      <div style={{
        height:     '3px',
        background: `linear-gradient(90deg, ${FALL.primary}, ${FALL.gold}, ${FALL.amber}, transparent)`,
      }} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem 4rem' }}>

        {/* ── Language switcher ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <LanguageSwitcher />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — HERO
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: '3rem' }}>

          {/* Season badge */}
          <div style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          '0.4rem',
            background:   `${FALL.primary}15`,
            border:       `1px solid ${FALL.primary}40`,
            borderRadius: '999px',
            padding:      '0.3rem 0.85rem',
            fontSize:     '0.72rem',
            color:        FALL.primary,
            fontWeight:   700,
            marginBottom: '1.25rem',
          }}>
            🍂 Fall 2026 · Season 1
            {seasonStatus === 'open' && daysLeft !== null && (
              <span style={{ color: FALL.muted, fontWeight: 400 }}>· {daysLeft}d left</span>
            )}
            {seasonStatus === 'upcoming' && (
              <span style={{ color: FALL.amber, fontWeight: 400 }}>· opens in {daysToOpen}d</span>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize:     'clamp(2rem, 6vw, 3.25rem)',
            fontWeight:   900,
            lineHeight:   1.1,
            marginBottom: '1rem',
            background:   `linear-gradient(135deg, ${FALL.white} 0%, ${FALL.amber} 60%, ${FALL.primary} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            The Fall Arena.
          </h1>

          {/* Tagline */}
          <p style={{
            fontSize:     '1.05rem',
            color:        '#aaa',
            lineHeight:   1.6,
            marginBottom: '1.5rem',
            maxWidth:     480,
          }}>
            {FALL_SEASON.tagline} The first season of the ANTCPU ADS network.
            Brands compete. Points accumulate. Rankings are permanent.
          </p>

          {/* Season status pill */}
          <div style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          '0.5rem',
            background:   seasonStatus === 'open' ? '#22c55e15' : `${FALL.amber}15`,
            border:       `1px solid ${seasonStatus === 'open' ? '#22c55e40' : `${FALL.amber}40`}`,
            borderRadius: '999px',
            padding:      '0.35rem 0.9rem',
            fontSize:     '0.75rem',
            fontWeight:   700,
            color:        seasonStatus === 'open' ? '#22c55e' : FALL.amber,
            marginBottom: '1.75rem',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: seasonStatus === 'open' ? '#22c55e' : FALL.amber,
              animation: seasonStatus === 'open' ? 'pulse 2s infinite' : 'none',
            }} />
            {seasonStatus === 'open'     && 'Season Open — Compete Now'}
            {seasonStatus === 'upcoming' && `Opens Sep 22 · ${daysToOpen} day${daysToOpen !== 1 ? 's' : ''} to go`}
            {seasonStatus === 'closed'   && 'Season Closed'}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/arena')}
              style={{
                background:   FALL.primary,
                border:       'none',
                borderRadius: '10px',
                color:        '#000',
                fontWeight:   800,
                fontSize:     '0.95rem',
                padding:      '0.85rem 2rem',
                cursor:       'pointer',
              }}
            >
              🏟️ Enter the Arena →
            </button>
            <button
              onClick={() => router.push('/login')}
              style={{
                background:   'transparent',
                border:       `1px solid ${FALL.primary}50`,
                borderRadius: '10px',
                color:        FALL.primary,
                fontWeight:   700,
                fontSize:     '0.95rem',
                padding:      '0.85rem 2rem',
                cursor:       'pointer',
              }}
            >
              Join Free →
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — LIVE STATS BAR
        ══════════════════════════════════════════════════════════════════ */}
        {!loading && stats && (
          <div style={{ marginBottom: '3rem' }}>
            <SectionLabel emoji="⚡" text="Live Network" />
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <StatPill value={stats.totalAds}                        label={t(locale, 'arena_stat_ads')}       color={FALL.primary} />
              <StatPill value={stats.totalBrands}                     label={t(locale, 'arena_stat_brands')}    color={FALL.amber}   />
              <StatPill value={stats.totalPoints.toLocaleString()}    label={t(locale, 'arena_stat_points')}    color={FALL.gold}    />
              <StatPill value={stats.totalReactions.toLocaleString()} label={t(locale, 'arena_stat_reactions')} color='#f0883e'      />
              <StatPill value={stats.totalCountries}                  label="Countries"                         color='#0070f3'      />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — TOP COUNTRIES
        ══════════════════════════════════════════════════════════════════ */}
        {!loading && stats && stats.topCountries.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <SectionLabel emoji="🌍" text="Top Countries" />
            <div style={{
              background:   FALL.card,
              border:       `1px solid ${FALL.border}`,
              borderRadius: '14px',
              padding:      '1.25rem',
            }}>
              {/* Top 3 podium */}
              <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {stats.topCountries.slice(0, 3).map((c, i) => (
                  <div key={c.country} style={{
                    flex:         1,
                    minWidth:     '80px',
                    background:   i === 0 ? `${FALL.gold}10` : FALL.bg,
                    border:       `1px solid ${i === 0 ? FALL.gold + '40' : FALL.border}`,
                    borderRadius: '10px',
                    padding:      '0.75rem',
                    textAlign:    'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{c.flag}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: i === 0 ? FALL.gold : FALL.white, marginBottom: '0.15rem' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {c.country}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: FALL.muted }}>{c.count} ads</div>
                  </div>
                ))}
              </div>

              {/* Remaining rows 4–10 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {stats.topCountries.slice(3).map((c, i) => {
                  const max = stats.topCountries[0]?.count || 1;
                  return (
                    <div key={c.country} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.68rem', color: FALL.muted, width: '20px', textAlign: 'right' }}>{i + 4}</span>
                      <span style={{ fontSize: '1rem' }}>{c.flag}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{c.country}</span>
                          <span style={{ fontSize: '0.68rem', color: FALL.muted }}>{c.count}</span>
                        </div>
                        <div style={{ height: '3px', background: FALL.border, borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${(c.count / max) * 100}%`, background: FALL.primary, borderRadius: '2px', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overflow — show more */}
              {stats.allCountries.length > 10 && (
                <button
                  onClick={() => router.push('/arena')}
                  style={{
                    marginTop:    '0.85rem',
                    width:        '100%',
                    background:   'transparent',
                    border:       `1px solid ${FALL.border2}`,
                    borderRadius: '8px',
                    color:        FALL.amber,
                    fontSize:     '0.75rem',
                    fontWeight:   700,
                    padding:      '0.5rem 0',
                    cursor:       'pointer',
                  }}
                >
                  🌍 + {stats.allCountries.length - 10} more countries in the Arena →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — TOP ADS
        ══════════════════════════════════════════════════════════════════ */}
        {!loading && stats && stats.topAds.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <SectionLabel emoji="🏆" text="Top Ads This Season" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stats.topAds.map((ad, i) => {
                const pos   = ad.rank_position ?? (i + 1);
                const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;
                return (
                  <div key={ad.id} style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '0.75rem',
                    background:   FALL.card,
                    border:       `1px solid ${i < 3 ? FALL.primary + '30' : FALL.border}`,
                    borderLeft:   `3px solid ${i < 3 ? FALL.primary : FALL.border}`,
                    borderRadius: '10px',
                    padding:      '0.65rem 0.85rem',
                  }}>
                    <div style={{ width: '28px', textAlign: 'center', fontSize: i < 3 ? '1rem' : '0.72rem', color: i < 3 ? undefined : FALL.muted, fontWeight: 700, flexShrink: 0 }}>
                      {medal || `#${pos}`}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: FALL.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ad.brand}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.62rem', color: FALL.muted, marginTop: '0.15rem' }}>
                        {ad.click_count    > 0 && <span>👆 {ad.click_count}</span>}
                        {ad.share_count    > 0 && <span>↗ {ad.share_count}</span>}
                        {ad.reaction_count > 0 && <span>🔥 {ad.reaction_count}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: FALL.primary, flexShrink: 0 }}>
                      ⚡ {ad.points.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 5 — TOP BRANDS
        ══════════════════════════════════════════════════════════════════ */}
        {!loading && stats && stats.topBrands.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <SectionLabel emoji="🔥" text="Leading Brands" />
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              {stats.topBrands.map((b, i) => (
                <button
                  key={b.brand}
                  onClick={() => router.push(`/arena/${b.slug}`)}
                  style={{
                    flex:         1,
                    minWidth:     '120px',
                    background:   i === 0 ? `${FALL.gold}10` : FALL.card,
                    border:       `1px solid ${i === 0 ? FALL.gold + '40' : FALL.border}`,
                    borderRadius: '12px',
                    padding:      '1rem',
                    cursor:       'pointer',
                    textAlign:    'left',
                  }}
                >
                  <div style={{ fontSize: '0.65rem', color: i === 0 ? FALL.gold : FALL.muted, fontWeight: 700, marginBottom: '0.35rem' }}>
                    {i === 0 ? '🥇 Top Brand' : i === 1 ? '🥈 #2' : '🥉 #3'}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: FALL.white, marginBottom: '0.2rem' }}>
                    {b.brand}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: i === 0 ? FALL.gold : FALL.amber, fontWeight: 700 }}>
                    ⚡ {b.pts.toLocaleString()} pts
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 6 — FEATURED PARTNER
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: '3rem' }}>
          <SectionLabel emoji="⭐" text="Featured Partner" />
          <FeaturedPartnerCard season="Season 1" compact={false} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 7 — SEASON MAP
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: '3rem' }}>
          <SectionLabel emoji="🗓️" text="Season Roadmap" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {SEASONS.filter(s => s.number > 0).map(season => {
              const status  = getSeasonStatus(season, now);
              const isFall  = season.slug === '1-fall2026';
              const statusColor =
                status === 'open'     ? '#22c55e' :
                status === 'upcoming' ? FALL.amber :
                FALL.muted;
              const statusLabel =
                status === 'open'     ? 'Open Now' :
                status === 'upcoming' ? `Opens in ${daysUntilOpen(season, now)}d` :
                'Closed';
              return (
                <div key={season.slug} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.85rem',
                  background:   isFall ? `${season.color}08` : FALL.card,
                  border:       `1px solid ${isFall ? season.color + '40' : FALL.border}`,
                  borderLeft:   `3px solid ${status === 'open' ? season.color : FALL.border}`,
                  borderRadius: '10px',
                  padding:      '0.75rem 1rem',
                }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{season.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isFall ? season.color : FALL.white }}>
                      Season {season.number} · {season.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: FALL.muted, marginTop: '0.1rem' }}>
                      {season.tagline}
                    </div>
                  </div>
                  <span style={{
                    fontSize:     '0.65rem',
                    fontWeight:   700,
                    color:        statusColor,
                    background:   `${statusColor}15`,
                    border:       `1px solid ${statusColor}30`,
                    borderRadius: '999px',
                    padding:      '0.2rem 0.6rem',
                    flexShrink:   0,
                  }}>
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 8 — JOIN CTA
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          background:   `linear-gradient(135deg, #0d0a10 0%, #1a0d0a 100%)`,
          border:       `1px solid ${FALL.primary}30`,
          borderRadius: '16px',
          padding:      '2rem',
          textAlign:    'center',
          position:     'relative',
          overflow:     'hidden',
        }}>
          {/* Top accent */}
          <div style={{
            position:   'absolute',
            top: 0, left: 0, right: 0,
            height:     '3px',
            background: `linear-gradient(90deg, ${FALL.primary}, ${FALL.gold}, transparent)`,
          }} />

          <div style={{ fontSize: '0.65rem', color: FALL.primary, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            🍂 Fall 2026 · Season 1
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Compete this season.
          </div>
          <div style={{ fontSize: '0.88rem', color: '#aaa', lineHeight: 1.6, marginBottom: '0.5rem' }}>
            {t(locale, 'arena_join_sub')}
          </div>
          <div style={{ fontSize: '0.75rem', color: FALL.muted2, marginBottom: '1.5rem' }}>
            {t(locale, 'arena_join_note')} · Rankings are permanent
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/login')}
              style={{
                background:   FALL.primary,
                border:       'none',
                borderRadius: '10px',
                color:        '#000',
                fontWeight:   800,
                fontSize:     '1rem',
                padding:      '0.9rem 2.5rem',
                cursor:       'pointer',
              }}
            >
              {t(locale, 'arena_join_cta')}
            </button>
            <button
              onClick={() => router.push('/arena')}
              style={{
                background:   'transparent',
                border:       `1px solid ${FALL.primary}50`,
                borderRadius: '10px',
                color:        FALL.primary,
                fontWeight:   700,
                fontSize:     '1rem',
                padding:      '0.9rem 2rem',
                cursor:       'pointer',
              }}
            >
              🏟️ View the Arena
            </button>
          </div>
        </div>

      </div>

      {/* ── Pulse animation ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      <ArenaFooter accent={FALL.primary} />
    </div>
  );
}


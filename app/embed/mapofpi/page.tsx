// app/embed/mapofpi/page.tsx
// ─── Map of Pi Arena embed — for mapofpi.com Wix HTML widget ──────────────────
// Self-contained page. No nav, no footer, no auth.
// Light theme — matches mapofpi.com white/gold palette.
// Fetches from /api/embed/mapofpi (60s cached, service role, no key exposure).
// Auto-refreshes every 60s.
// Wix: <iframe src="https://antcpu-ads.vercel.app/embed/mapofpi" ...>
'use client';

import { useEffect, useState } from 'react';

const C = {
  bg:      '#ffffff',
  card:    '#f9f9f9',
  border:  '#e8e8e8',
  text:    '#1a1a2e',
  muted:   '#666',
  dim:     '#999',
  gold:    '#c9a227',
  goldBg:  '#fffbf0',
  goldBdr: '#f0d060',
  green:   '#2E7D32',
  blue:    '#1a3a6e',
  orange:  '#c85a00',
};

const TIER_COLOR: Record<string, string> = {
  top_tier: C.orange,
  featured: '#9b1a8a',
  rising:   '#5a1a9b',
  entry:    C.green,
};

const TIER_LABEL: Record<string, string> = {
  top_tier: 'Top Tier',
  featured: 'Featured',
  rising:   'Rising',
  entry:    'Entry',
};

type Ad = {
  id:              string;
  title:           string;
  description:     string;
  url:             string | null;
  tier:            string;
  points:          number;
  country?:        string;
  rank_position?:  number;
  share_count?:    number;
  click_count?:    number;
  reaction_count?: number;
};

type EmbedData = {
  ads:         Ad[];
  totalPoints: number;
  topRank:     number | null;
  adCount:     number;
  countryCount: number;
  generatedAt: string;
};

// ─── Country flag map (subset — Pi Network active regions) ────────────────────
const FLAGS: Record<string, string> = {
  'United States':'🇺🇸','United Kingdom':'🇬🇧','Nigeria':'🇳🇬','Kenya':'🇰🇪',
  'Ghana':'🇬🇭','South Africa':'🇿🇦','India':'🇮🇳','Philippines':'🇵🇭',
  'Indonesia':'🇮🇩','Vietnam':'🇻🇳','Japan':'🇯🇵','South Korea':'🇰🇷',
  'China':'🇨🇳','Germany':'🇩🇪','France':'🇫🇷','Brazil':'🇧🇷',
  'Mexico':'🇲🇽','Canada':'🇨🇦','Australia':'🇦🇺','Malaysia':'🇲🇾',
  'Thailand':'🇹🇭','Turkey':'🇹🇷','Egypt':'🇪🇬','Morocco':'🇲🇦',
  'Tanzania':'🇹🇿','Uganda':'🇺🇬','Cameroon':'🇨🇲','Zimbabwe':'🇿🇼',
};
const flag = (c?: string) => c ? (FLAGS[c] || '🌍') : '';

export default function MapOfPiEmbed() {
  const [data,    setData]    = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  async function load() {
    try {
      const res  = await fetch('/api/embed/mapofpi');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ color: C.dim, fontSize: '0.85rem' }}>Loading Map of Pi Arena...</div>
    </div>
  );

  if (error || !data) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ color: C.dim, fontSize: '0.85rem' }}>Unable to load — try refreshing.</div>
    </div>
  );

  // ─── Group: core Map of Pi ads vs Country Champions ───────────────────────
  const coreAds     = data.ads.filter(a => !a.country);
  const championAds = data.ads.filter(a =>  a.country);

  // Group champions by country
  const byCountry: Record<string, Ad[]> = {};
  for (const ad of championAds) {
    const c = ad.country!;
    if (!byCountry[c]) byCountry[c] = [];
    byCountry[c].push(ad);
  }
  const countries = Object.keys(byCountry).sort((a, b) =>
    (byCountry[b][0].points || 0) - (byCountry[a][0].points || 0)
  );

  const medal = (rank?: number) =>
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  function AdCard({ ad, i }: { ad: Ad; i: number }) {
    const rank  = ad.rank_position ?? (i + 1);
    const m     = medal(rank);
    const color = TIER_COLOR[ad.tier] || C.green;
    const isTop = rank <= 3;
    const href  = ad.url || 'https://mapofpi.com';

    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          background:   isTop ? C.goldBg : C.card,
          border:       `1px solid ${isTop ? C.goldBdr : C.border}`,
          borderLeft:   `3px solid ${isTop ? C.gold : color}`,
          borderRadius: '10px',
          padding:      '0.75rem 0.9rem',
          marginBottom: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <div style={{ fontSize: m ? '1rem' : '0.7rem', color: m ? undefined : C.dim,
              width: '22px', textAlign: 'center', flexShrink: 0, paddingTop: '0.1rem', fontWeight: 700 }}>
              {m || `#${rank}`}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text,
                marginBottom: '0.2rem', lineHeight: 1.3 }}>
                {ad.title}
              </div>
              <div style={{ fontSize: '0.73rem', color: C.muted, lineHeight: 1.4, marginBottom: '0.4rem' }}>
                {ad.description.length > 85 ? ad.description.slice(0, 85) + '…' : ad.description}
              </div>
              <div style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, color,
                  background: `${color}15`, border: `1px solid ${color}30`,
                  borderRadius: '999px', padding: '0.12rem 0.45rem',
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {TIER_LABEL[ad.tier] || ad.tier}
                </span>
                <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.67rem', color: C.muted }}>
                  {(ad.click_count    || 0) > 0 && <span>👆 {ad.click_count}</span>}
                  {(ad.share_count    || 0) > 0 && <span>↗ {ad.share_count}</span>}
                  {(ad.reaction_count || 0) > 0 && <span>🔥 {ad.reaction_count}</span>}
                  <span style={{ color: C.gold, fontWeight: 700 }}>
                    ⚡ {(ad.points || 0).toLocaleString()} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '1.25rem 1.1rem 2rem', boxSizing: 'border-box' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: C.text }}>
            🗺️ Map of Pi — Arena Campaign
          </div>
          <span style={{ background: C.goldBg, border: `1px solid ${C.goldBdr}`,
            borderRadius: '999px', padding: '0.18rem 0.6rem',
            fontSize: '0.62rem', color: C.gold, fontWeight: 700 }}>
            ⚡ LIVE
          </span>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Arena Points', value: data.totalPoints.toLocaleString(), color: C.gold   },
            { label: 'Active Ads',   value: data.adCount,                      color: C.green  },
            { label: 'Countries',    value: data.countryCount,                 color: C.blue   },
            { label: 'Network Rank', value: data.topRank ? `#${data.topRank}` : '#1', color: C.orange },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.6rem', color: C.muted,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.12rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gold divider ── */}
      <div style={{ height: '2px', background: `linear-gradient(90deg, ${C.gold}, transparent)`,
        marginBottom: '1rem', borderRadius: '999px' }} />

      {/* ── Core Map of Pi ads ── */}
      {coreAds.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.green,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            🗺️ Map of Pi
          </div>
          {coreAds.map((ad, i) => <AdCard key={ad.id} ad={ad} i={i} />)}
        </div>
      )}

      {/* ── Country Champions ── */}
      {countries.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.gold,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            🏆 Country Champions
          </div>
          {countries.map(country => (
            <div key={country} style={{ marginBottom: '0.85rem' }}>
              {/* Country header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem',
                marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1rem' }}>{flag(country)}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.text }}>
                  {country}
                </span>
                <span style={{ fontSize: '0.62rem', color: C.muted }}>
                  · {byCountry[country].reduce((s, a) => s + (a.points || 0), 0)} pts
                </span>
              </div>
              {byCountry[country].map((ad, i) => <AdCard key={ad.id} ad={ad} i={i} />)}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer CTA ── */}
      <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
        <a href="https://antcpu-ads.vercel.app/mapofpi?promo=MAPOFPI"
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', background: C.gold, color: '#fff',
            fontWeight: 700, fontSize: '0.82rem', padding: '0.6rem 1.4rem',
            borderRadius: '8px', textDecoration: 'none', marginBottom: '0.6rem' }}>
          ⚡ Claim Your Country →
        </a>
        <div style={{ fontSize: '0.6rem', color: C.dim }}>
          Powered by{' '}
          <a href="https://antcpu-ads.vercel.app/arena" target="_blank"
            rel="noopener noreferrer" style={{ color: C.dim }}>
            ANTCPU ADS Arena
          </a>
          {' '}· updates every 60s
        </div>
      </div>
    </div>
  );
}

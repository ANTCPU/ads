'use client';
import { useState, useEffect } from 'react';
import { ModuleContext } from '../types';

// ─── ANTCPU brand family — first archived ads will come from here
// ─── but this module fetches ALL archived ads regardless of brand
// ─── as more brands archive ads, they appear here automatically
// ─── future: filter by brand slug if needed per arena context
const ANTCPU_BRANDS = ['ANTCPU ADS', 'ANTCPU', 'ANTCPU CLOUD', 'ANTCPU EDU'];

type ArchivedAd = {
  id: string;
  brand: string;
  title: string;
  description: string;
  category: string;
  tier: string;
  points: number;
  created_at: string;
};

export default function ArchiveModule({ supabase }: ModuleContext) {
  const [ads, setAds] = useState<ArchivedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetchArchived() {
      const { data } = await supabase
        .from('ads')
        .select('id, brand, title, description, category, tier, points, created_at')
        .eq('status', 'archived')
        // ── All brands included — ANTCPU family seeded first
        // ── No brand filter here — archive grows with every brand
        .order('points', { ascending: false });
      setAds(data || []);
      setLoading(false);
    }
    fetchArchived();
  }, []);

  // ── Split: ANTCPU family first, then all other brands below
  const antcpuAds = ads.filter(a => ANTCPU_BRANDS.includes(a.brand));
  const otherAds  = ads.filter(a => !ANTCPU_BRANDS.includes(a.brand));
  const total = ads.length;

  if (loading) return null;
  if (total === 0) return null; // hide entirely if nothing archived yet

  return (
    <div style={{ marginTop: '1.5rem' }}>

      {/* ── Header — collapsed by default ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'transparent',
          border: '1px solid #1a1a1a',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: '#444',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
          📦 Arena Archive
          <span style={{
            marginLeft: '0.5rem',
            background: '#1a1a1a',
            borderRadius: '999px',
            padding: '0.1rem 0.55rem',
            fontSize: '0.72rem',
            color: '#555',
          }}>
            {total}
          </span>
        </span>
        <span style={{ fontSize: '0.75rem', color: '#333' }}>
          {open ? '▲ collapse' : '▼ expand'}
        </span>
      </button>

      {/* ── Expanded content ── */}
      {open && (
        <div style={{ marginTop: '0.75rem' }}>

          {/* ── ANTCPU family section ── */}
          {antcpuAds.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{
                fontSize: '0.65rem', color: '#333', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: '0.5rem', padding: '0 0.25rem',
              }}>
                ANTCPU
              </p>
              {antcpuAds.map(ad => <ArchiveCard key={ad.id} ad={ad} />)}
            </div>
          )}

          {/* ── All other brands ── */}
          {otherAds.length > 0 && (
            <div>
              <p style={{
                fontSize: '0.65rem', color: '#333', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: '0.5rem', padding: '0 0.25rem',
              }}>
                Other Brands
              </p>
              {otherAds.map(ad => <ArchiveCard key={ad.id} ad={ad} />)}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Archive card — display only, no engagement ──────────────────────────────
function ArchiveCard({ ad }: { ad: ArchivedAd }) {
  return (
    <div style={{
      background: '#0d0d0d',
      border: '1px solid #161616',
      borderRadius: '10px',
      padding: '0.9rem 1rem',
      marginBottom: '0.5rem',
      opacity: 0.7,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.35rem',
      }}>
        <span style={{
          fontSize: '0.65rem', color: '#333', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {ad.brand}
        </span>
        <span style={{
          fontSize: '0.6rem', color: '#2a2a2a',
          background: '#161616', borderRadius: '4px',
          padding: '0.1rem 0.4rem',
        }}>
          {ad.tier}
        </span>
        {ad.points > 0 && (
          <span style={{ fontSize: '0.6rem', color: '#2a2a2a', marginLeft: 'auto' }}>
            ⚡ {ad.points} pts
          </span>
        )}
      </div>
      <p style={{
        fontSize: '0.8rem', color: '#3a3a3a',
        fontWeight: 600, margin: '0 0 0.25rem',
      }}>
        {ad.title}
      </p>
      <p style={{
        fontSize: '0.72rem', color: '#2a2a2a',
        margin: 0, lineHeight: 1.4,
      }}>
        {ad.description.length > 80
          ? ad.description.slice(0, 80) + '…'
          : ad.description}
      </p>
    </div>
  );
}

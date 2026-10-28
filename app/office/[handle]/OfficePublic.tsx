// ============================================================
// app/office/[handle]/OfficePublic.tsx
// Corporate viewer mode — clean business card for public/challengers
// No clutter. Typography-led. Single scroll.
// ============================================================

'use client';

import { useState } from 'react';

type OfficeData = {
  handle: string;
  name: string;
  initials: string;
  color: string | null;
  track: string;
  country: string;
  role_title: string;
  bio: string | null;
  stack: string | null;
  channels: string | null;
  github_handle: string | null;
  brand_slug: string | null;
  badges: string[];
  links: Record<string, string> | null;
  arena: { points: number; tier: string | null; is_champion: boolean; streak: number } | null;
  clock: { week: number; week_name: string; days_left_total: number; next_cohort: { opens_in_days: number; apply_url: string; cohort: string } | null } | null;
  activity: { label: string; icon: string; created_at: string }[];
  cohort: string;
  cohort_short: string;
  is_captain: boolean | null;
  elevation_level?: number;
  ad?: { title: string; description: string; url: string; category: string } | null;
};

const BADGE_LABELS: Record<string, string> = {
  'founder':      '⚡ Founder',
  'verified-cv':  '📄 Verified',
  'mentor':       '🎓 Mentor',
  'veteran':      '🎖️ Veteran',
  'early-bird':   '🐦 Early Bird',
  'rising':       '⬆️ Rising',
  'd12':          '🚢 Shipped',
  'country-champ':'🏆 Country Champ',
  'returning':    '⭐ Returning',
};

function badge(slug: string) {
  return BADGE_LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function relTime(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 2)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function OfficePublic({ data }: { data: OfficeData }) {
  const [copied, setCopied] = useState(false);
  const accent  = data.color ?? '#2563eb';
  const isDev   = data.track !== 'marketing';
  const officeUrl = `https://antcpu-ads.vercel.app/office/${data.handle}`;

  const ghHandle = data.github_handle
    ? data.github_handle.replace('https://github.com/', '').replace(/\/$/, '')
    : null;

  const linkItems = [
    data.links?.site     && { label: 'Website',  href: data.links.site,     icon: '🌐' },
    data.links?.github   && { label: 'GitHub',   href: data.links.github,   icon: '🐙' },
    data.links?.arena    && { label: 'Arena',    href: data.links.arena,    icon: '⚡' },
    ghHandle             && { label: 'GitHub',   href: `https://github.com/${ghHandle}`, icon: '🐙' },
    data.brand_slug      && { label: 'Ad',       href: `https://antcpu-ads.vercel.app/arena/${data.brand_slug}`, icon: '📣' },
  ].filter(Boolean) as { label: string; href: string; icon: string }[];

  // Deduplicate by href
  const seen = new Set<string>();
  const links = linkItems.filter(l => { if (seen.has(l.href)) return false; seen.add(l.href); return true; });

  async function copy() {
    await navigator.clipboard.writeText(officeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#111',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        borderBottom: '1px solid #e5e7eb',
        padding: '0 1.5rem',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <a href="https://antcpu.io" style={{ textDecoration: 'none' }}>
          <span style={{ fontWeight: 900, fontSize: '0.95rem', letterSpacing: '-0.02em', color: '#111' }}>
            antcpu
          </span>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: 6 }}>internship</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 600,
            color: isDev ? '#2563eb' : '#d97706',
            background: isDev ? '#eff6ff' : '#fffbeb',
            padding: '0.2rem 0.6rem', borderRadius: 999,
          }}>
            {isDev ? '💻 Dev' : '📣 Marketing'}
          </span>
          <a href="https://antcpu.io/apply/" style={{
            fontSize: '0.75rem', fontWeight: 700,
            background: '#111', color: '#fff',
            padding: '0.35rem 0.85rem', borderRadius: 6,
            textDecoration: 'none',
          }}>
            Apply →
          </a>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        {/* ── Hero ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {/* Initials */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: accent,
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 900,
            flexShrink: 0,
            boxShadow: `0 0 0 4px ${accent}22`,
          }}>
            {data.initials ?? data.name?.[0]}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontSize: '1.6rem', fontWeight: 900,
              letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1,
            }}>
              {data.name}
            </h1>
            <div style={{ marginTop: '0.35rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
              {data.role_title}
            </div>
            <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {data.country}
              </span>
              <span style={{ color: '#d1d5db' }}>·</span>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {data.cohort_short?.toUpperCase()} cohort
              </span>
              {data.badges.slice(0, 3).map(b => (
                <span key={b} style={{
                  fontSize: '0.68rem', fontWeight: 600,
                  background: '#f3f4f6', color: '#374151',
                  padding: '0.15rem 0.5rem', borderRadius: 999,
                }}>
                  {badge(b)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: '2rem' }} />

        {/* ── Bio ── */}
        {data.bio && (
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{
              fontSize: '1.05rem', lineHeight: 1.75,
              color: '#374151', margin: 0,
              fontWeight: 400,
            }}>
              {data.bio}
            </p>
          </div>
        )}

        {/* ── 3-col meta ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem',
        }}>
          {/* Stack */}
          {data.stack && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                Stack
              </div>
              <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>
                {data.stack.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                  <div key={s}>{s}</div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {links.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                Links
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {links.map(l => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.85rem', color: accent, textDecoration: 'none', fontWeight: 500 }}>
                    {l.icon} {l.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Channels */}
          {data.channels && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                Channels
              </div>
              <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>
                {data.channels.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                  <div key={c}>{c}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: '2rem' }} />

        {/* ── Arena stats ── */}
        {data.arena && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              Arena
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: accent, lineHeight: 1 }}>
                  {data.arena.points}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>points</div>
              </div>
              {data.arena.tier && (
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111', lineHeight: 1, textTransform: 'capitalize' }}>
                    {data.arena.tier}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>tier</div>
                </div>
              )}
              {data.arena.is_champion && (
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1 }}>🏆</div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>champion</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Recent activity ── */}
        {data.activity?.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              Recent Activity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.activity.slice(0, 4).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{a.icon}</span>
                  <span style={{ fontSize: '0.85rem', color: '#374151', flex: 1 }}>{a.label}</span>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {relTime(a.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: '2rem' }} />

        {/* ── Next cohort CTA ── */}
        {data.clock?.next_cohort && (
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                Join the next cohort
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Opens in {data.clock.next_cohort.opens_in_days} days · {data.clock.next_cohort.cohort}
              </div>
            </div>
            <a href={data.clock.next_cohort.apply_url} target="_blank" rel="noopener noreferrer"
              style={{
                background: '#111', color: '#fff',
                padding: '0.6rem 1.25rem', borderRadius: 8,
                fontWeight: 700, fontSize: '0.85rem',
                textDecoration: 'none',
              }}>
              Apply →
            </a>
          </div>
        )}

        {/* ── Share row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>
            {officeUrl}
          </span>
          <button onClick={copy} style={{
            fontSize: '0.72rem', fontWeight: 700,
            background: copied ? '#111' : 'transparent',
            color: copied ? '#fff' : '#6b7280',
            border: '1px solid #d1d5db',
            padding: '0.3rem 0.75rem', borderRadius: 6,
            cursor: 'pointer',
          }}>
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
        </div>

      </div>
    </div>
  );
}

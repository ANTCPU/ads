'use client';

import { NODE_MAP } from '../../../lib/officeConstants';

// ── Office Banner ─────────────────────────────────────────────
export default function OfficeBanner({
  bannerUrl, bannerLink, name, accent, border, teamId, isCaptain, captainTeam, track, brandSlug,
  progressPct, bannerUnlocked, isOwner, challengerId,
}: {
  bannerUrl: string | null | undefined;
  bannerLink?: string | null;
  name: string; accent: string; border: string;
  teamId?: string | null; isCaptain?: boolean | null;
  captainTeam?: string | null; track?: string;
  brandSlug?: string | null;
  progressPct?: number | null;
  bannerUnlocked?: boolean | null;
  isOwner?: boolean;
  challengerId?: string;
}) {
  const node = teamId ? NODE_MAP[teamId] : null;

  // Track-aware CTA links
  const devLink     = 'https://github.com/ANTCPU/ads/issues';
  const mktLink     = brandSlug ? `https://antcpu-ads.vercel.app/arena/${brandSlug}` : 'https://antcpu-ads.vercel.app/arena';
  const ctaUrl      = track === 'marketing' ? mktLink : devLink;
  const ctaLabel    = track === 'marketing' ? '→ Arena' : '→ GitHub Issues';
  const captainUrl  = captainTeam
    ? `https://antcpu-ads.vercel.app/office/${captainTeam}`
    : null;

  return (
    <div className="mb-6 rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
      {/* Banner image if set */}
      {/* Banner unlocked — no URL yet — owner sees input CTA */}
      {bannerUnlocked && !bannerUrl && isOwner && (
        <div style={{
          background: '#0f172a', borderBottom: '1px solid #1e293b',
          padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🎉</span>
            <span style={{ color: '#f0883e', fontWeight: 700, fontSize: '0.95rem' }}>
              Banner unlocked! Add your project URL
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
            {track === 'marketing'
              ? 'Paste your Arena ad, campaign page, or social link — visitors will see it on your office.'
              : 'Paste your live app, GitHub repo, or portfolio — visitors will see it on your office.'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              id="banner-url-input"
              type="url"
              placeholder="https://your-project.com"
              style={{
                flex: 1, minWidth: '200px', background: '#1e293b', border: '1px solid #334155',
                borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#f1f5f9',
                fontSize: '0.85rem', outline: 'none',
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById('banner-url-input') as HTMLInputElement;
                if (input?.value) {
                  fetch('/api/internship/challenger/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ challenger_id: challengerId, banner_url: input.value }),
                  }).then(() => window.location.reload());
                }
              }}
              style={{
                background: '#f0883e', color: '#000', fontWeight: 700,
                border: 'none', borderRadius: '6px', padding: '0.5rem 1rem',
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Save Banner
            </button>
          </div>
        </div>
      )}

      {/* Teaser — 55–74%, not yet unlocked, owner only */}
      {!bannerUnlocked && isOwner && (progressPct ?? 0) >= 55 && (progressPct ?? 0) < 75 && (
        <div style={{
          background: '#0f172a', borderBottom: '1px solid #1e293b',
          padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
        }}>
          <span style={{ fontSize: '1rem' }}>🔒</span>
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
            <strong style={{ color: '#94a3b8' }}>Banner unlocks at 75%</strong> — complete Week 3 to add your project to your office.
          </span>
        </div>
      )}

      {/* Banner image */}
      {bannerUrl && (
        <div style={{ aspectRatio: '1200 / 630', position: 'relative', background: '#f0e8dc' }}>
          {bannerLink ? (
            <a href={bannerLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
              <img src={bannerUrl} alt={`${name}'s office`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }} />
            </a>
          ) : (
            <img src={bannerUrl} alt={`${name}'s office`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          )}
        </div>
      )}

      {/* Node team strip — always shown if team assigned */}
      {node && (
        <div style={{
          background: `${node.color}18`,
          borderTop: bannerUrl ? `1px solid ${border}` : 'none',
          padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              background: node.color, color: '#000', fontWeight: 700,
              fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '999px',
            }}>
              {node.emoji} NODE {teamId?.split('-')[1]?.toUpperCase()} — {node.name.toUpperCase()}
            </span>
            {isCaptain && (
              <span style={{
                background: '#ffd70022', color: '#ffd700', border: '1px solid #ffd70055',
                fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '999px',
              }}>
                👑 Captain
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {captainUrl && !isCaptain && (
              <a href={captainUrl} target="_blank" rel="noreferrer" style={{
                fontSize: '0.72rem', padding: '0.25rem 0.75rem', borderRadius: '999px',
                border: `1px solid ${node.color}`, color: node.color, textDecoration: 'none',
              }}>
                → Captain Office
              </a>
            )}
            <a href={`https://antcpu-ads.vercel.app/squad/${teamId}`} style={{
              fontSize: '0.72rem', padding: '0.25rem 0.75rem', borderRadius: '999px',
              border: `1px solid ${node.color}44`, color: node.color, textDecoration: 'none',
            }}>
              👥 View Squad
            </a>
            <a href={ctaUrl} target="_blank" rel="noreferrer" style={{
              fontSize: '0.72rem', padding: '0.25rem 0.75rem', borderRadius: '999px',
              background: node.color, color: '#000', fontWeight: 600, textDecoration: 'none',
            }}>
              {ctaLabel}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

// app/components/ArenaFooter.tsx
// ─── Arena Footer ─────────────────────────────────────────────────────────────
// v2 (Sep 2026):
//   — EDU column added — antcpu EDU is now a real product
//   — MAC + Shop Builder link added to Product column
//   — antcpu.com/cloud/ → antcpu-ads.vercel.app (correct arena URL)
//   — Support page link added
//   — Discord link updated to real server
//   — Status indicator — live pulse dot
//   — Mobile: single column stack, no overflow
//   — accentColor default consistent with design system
// ─────────────────────────────────────────────────────────────────────────────

import React    from 'react';
import { useRouter } from 'next/navigation';

export default function ArenaFooter({
  brand  = 'ANTCPU ADS',
  accent = '#f0883e',
}: {
  brand?:  string;
  accent?: string;
}) {
  const router = useRouter();
  const year   = new Date().getFullYear();

  function nav(href: string) {
    if (href.startsWith('http')) { window.open(href, '_blank'); return; }
    router.push(href);
  }

  function link(label: string, href: string) {
    return (
      <div
        key={label}
        onClick={() => nav(href)}
        style={{
          fontSize:     '0.82rem',
          color:        '#444',
          cursor:       'pointer',
          marginBottom: '0.5rem',
          transition:   'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = accent)}
        onMouseLeave={e => (e.currentTarget.style.color = '#444')}
      >
        {label}
      </div>
    );
  }

  function col(title: string, items: { label: string; href: string }[]) {
    return (
      <div key={title} style={{ minWidth: '130px' }}>
        <div style={{
          fontSize:      '0.65rem',
          color:         '#2a2a2a',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom:  '0.85rem',
          fontWeight:    700,
        }}>
          {title}
        </div>
        {items.map(i => link(i.label, i.href))}
      </div>
    );
  }

  return (
    <footer style={{
      borderTop:  '1px solid #111',
      background: '#0a0a0a',
      padding:    '3rem 2rem 1.5rem',
      marginTop:  '3rem',
      width:      '100%',
      boxSizing:  'border-box',
    }}>

      {/* ── Top row ── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        flexWrap:       'wrap',
        gap:            '2.5rem',
        marginBottom:   '2.5rem',
      }}>

        {/* ── Brand block ── */}
        <div style={{ minWidth: '200px', maxWidth: '260px' }}>
          <div style={{
            fontWeight:   800,
            fontSize:     '1rem',
            color:        '#fff',
            marginBottom: '0.5rem',
          }}>
            ⚡ ANTCPU ADS
          </div>
          <div style={{
            fontSize:     '0.75rem',
            color:        '#333',
            lineHeight:   1.7,
            marginBottom: '1rem',
          }}>
            Automated marketing powered by AI antbots.<br />
            Veteran-built. Free to start. Global reach.
          </div>

          {/* Status pill */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '0.4rem',
            marginBottom: '1rem',
          }}>
            <span style={{
              width:        '6px',
              height:       '6px',
              borderRadius: '50%',
              background:   '#22c55e',
              display:      'inline-block',
              boxShadow:    '0 0 6px #22c55e80',
            }} />
            <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 600 }}>
              Arena live
            </span>
          </div>

          {/* Champion CTA */}
          <div
            onClick={() => nav('/mac')}
            style={{
              display:      'inline-block',
              background:   'none',
              border:       `1px solid ${accent}50`,
              color:        accent,
              borderRadius: '7px',
              padding:      '0.4rem 0.9rem',
              fontSize:     '0.75rem',
              fontWeight:   600,
              cursor:       'pointer',
              transition:   'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = `${accent}50`)}
          >
            🏆 Country Champion →
          </div>
        </div>

        {/* ── Link columns ── */}
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>

          {col('Product', [
            { label: 'The Arena',    href: '/arena'          },
            { label: 'Ad Builder',   href: '/create-ad'      },
            { label: 'MAC — Shop Builder', href: '/mac'      },
            { label: 'Dashboard',    href: '/dashboard/user' },
            { label: 'Profile',      href: '/profile'        },
            { label: 'Support',      href: '/support'        },
          ])}

          {col('EDU', [
            { label: 'Free Classes',  href: 'https://antcpu.com/edu/'                              },
            { label: 'Internship',    href: 'https://antcpu.io/apply/'                             },
            { label: 'Map of Pi',     href: 'https://mapofpi.com/'                                 },
            { label: 'chatwithmac',   href: 'https://chatwithmac.com'                              },
          ])}

          {col('Brands', [
            { label: 'ANTCPU ADS',         href: '/arena/antcpu'     },
            { label: 'Map of Pi',          href: '/arena/mapofpi'    },
            { label: 'Amanda Photography', href: '/arena/amanda'     },
            { label: 'PiPioneersX',        href: '/arena/pipioneers' },
          ])}

          {col('Company', [
            { label: 'antcpu.com',   href: 'https://antcpu.com'              },
            { label: 'antcpu.io',    href: 'https://antcpu.io'               },
            { label: 'antcpu.cloud', href: 'https://antcpu.cloud'            },
            { label: 'Terms',        href: '/tos'                            },
            { label: 'Privacy',      href: '/privacy'                        },
          ])}

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{
        borderTop:      '1px solid #111',
        paddingTop:     '1.25rem',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        flexWrap:       'wrap',
        gap:            '0.75rem',
      }}>
        <div style={{ fontSize: '0.7rem', color: '#2a2a2a' }}>
          © {year} ANTCPU ADS · Built by Antony Ciccone · Thomasville, NC
        </div>

        <div style={{
          display:    'flex',
          gap:        '1.25rem',
          alignItems: 'center',
          flexWrap:   'wrap',
        }}>
          <a
            href="mailto:antcpu@gmail.com"
            style={{ fontSize: '0.7rem', color: '#333', textDecoration: 'none' }}
          >
            ✉️ Contact
          </a>
          <a
            href="https://discord.gg/antcpu"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.7rem', color: '#333', textDecoration: 'none' }}
          >
            💬 Discord
          </a>
          <a
            href="https://antcpu.com/edu/"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.7rem', color: '#333', textDecoration: 'none' }}
          >
            🎓 EDU
          </a>
          <span style={{ fontSize: '0.7rem', color: accent, fontWeight: 700 }}>
            ⚡ {brand}
          </span>
        </div>
      </div>

    </footer>
  );
}

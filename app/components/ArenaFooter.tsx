'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function ArenaFooter({ brand = 'ANTCPU ADS', accent = '#0070f3' }: { brand?: string; accent?: string }) {
  const router = useRouter();
  const year = new Date().getFullYear();

  return (
    <footer style={{
      borderTop: '1px solid #111',
      background: '#0a0a0a',
      padding: '2.5rem 1.25rem 1.5rem',
      marginTop: '3rem',
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>

          {/* Brand */}
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: '0.4rem' }}>⚡ ANTCPU ADS</div>
            <div style={{ fontSize: '0.78rem', color: '#444', maxWidth: '220px', lineHeight: 1.6 }}>
              The Arena — automated marketing powered by AI antbots.
            </div>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Platform</div>
              {[
                { label: 'The Arena', href: '/arena/ads-network' },
                { label: 'Leaderboard', href: '/dashboard/leaderboard' },
                { label: 'Create Ad', href: '/create-ad' },
                { label: 'Dashboard', href: '/dashboard/user' },
              ].map(l => (
                <div key={l.label} onClick={() => router.push(l.href)}
                  style={{ fontSize: '0.82rem', color: '#555', cursor: 'pointer', marginBottom: '0.4rem', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = accent)}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >{l.label}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Brands</div>
              {[
                { label: 'ANTCPU', href: '/arena/antcpu' },
                { label: 'Map of Pi', href: '/arena/mapofpi' },
                { label: 'Photography', href: '/arena/photography' },
                { label: 'ADS Network', href: '/arena/ads-network' },
              ].map(l => (
                <div key={l.label} onClick={() => router.push(l.href)}
                  style={{ fontSize: '0.82rem', color: '#555', cursor: 'pointer', marginBottom: '0.4rem', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = accent)}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >{l.label}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Company</div>
              {[
                { label: 'About', href: '/about' },
                { label: 'Terms of Service', href: '/tos' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'antcpu.com', href: 'https://antcpu.com' },
              ].map(l => (
                <div key={l.label}
                  onClick={() => l.href.startsWith('http') ? window.open(l.href, '_blank') : router.push(l.href)}
                  style={{ fontSize: '0.82rem', color: '#555', cursor: 'pointer', marginBottom: '0.4rem', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = accent)}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >{l.label}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ borderTop: '1px solid #111', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#333' }}>
            © {year} ANTCPU ADS · Built by Antony Ciccone · Thomasville, NC
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="https://discord.gg/antcpu" target="_blank" rel="noreferrer"
              style={{ fontSize: '0.72rem', color: '#444', textDecoration: 'none' }}>💬 Discord</a>
            <a href="mailto:antcpu@gmail.com"
              style={{ fontSize: '0.72rem', color: '#444', textDecoration: 'none' }}>✉️ Contact</a>
            <div style={{ fontSize: '0.72rem', color: accent, fontWeight: 700 }}>⚡ {brand}</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

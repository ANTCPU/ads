'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function ArenaFooter({ brand = 'ANTCPU ADS', accent = '#0070f3' }: { brand?: string; accent?: string }) {
  const router = useRouter();
  const year = new Date().getFullYear();

  const nav = (href: string) => {
    if (href.startsWith('http')) { window.open(href, '_blank'); return; }
    router.push(href);
  };

  const link = (label: string, href: string) => (
    <div key={label} onClick={() => nav(href)}
      style={{ fontSize: '0.82rem', color: '#555', cursor: 'pointer', marginBottom: '0.45rem' }}
      onMouseEnter={e => (e.currentTarget.style.color = accent)}
      onMouseLeave={e => (e.currentTarget.style.color = '#555')}
    >{label}</div>
  );

  const col = (title: string, items: { label: string; href: string }[]) => (
    <div key={title}>
      <div style={{ fontSize: '0.65rem', color: '#2a2a2a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.85rem', fontWeight: 700 }}>{title}</div>
      {items.map(i => link(i.label, i.href))}
    </div>
  );

  return (
    <footer style={{
      borderTop: '1px solid #111',
      background: '#0a0a0a',
      padding: '2.5rem 2rem 1.5rem',
      marginTop: '3rem',
      width: '100%',
      boxSizing: 'border-box',
    }}>

      {/* Top row — full width, same padding as nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>

        {/* Brand */}
        <div style={{ minWidth: '180px' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: '0.4rem' }}>⚡ ANTCPU ADS</div>
          <div style={{ fontSize: '0.75rem', color: '#333', lineHeight: 1.6, maxWidth: '200px' }}>
            The Arena — automated marketing powered by AI antbots. Free 3-day trial.
          </div>
          <div onClick={() => nav('/profile')}
            style={{ marginTop: '0.85rem', display: 'inline-block', background: 'none', border: `1px solid ${accent}50`, color: accent, borderRadius: '7px', padding: '0.4rem 0.9rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            🔗 Get Your Referral Code →
          </div>
        </div>

        {/* Link columns */}
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          {col('Platform', [
            { label: 'The Arena',        href: '/arena/ads-network' },
            { label: 'Leaderboard',      href: '/dashboard/leaderboard' },
            { label: 'Create Ad',        href: '/create-ad' },
            { label: 'Dashboard',        href: '/dashboard/user' },
            { label: 'Profile',          href: '/profile' },
            { label: 'Arena Status',     href: '/dashboard/test' },
          ])}
          {col('Brands', [
            { label: 'ANTCPU',           href: '/arena/antcpu' },
            { label: 'Map of Pi',        href: '/arena/mapofpi' },
            { label: 'Photography',      href: '/arena/photography' },
            { label: 'ADS Network',      href: '/arena/ads-network' },
            { label: 'PiPioneersX',      href: '/arena/pipioneers' },
          ])}
          {col('Company', [
            { label: 'About',            href: '/about' },
            { label: 'Terms of Service', href: '/tos' },
            { label: 'Privacy Policy',   href: '/privacy' },
            { label: 'antcpu.com',       href: 'https://antcpu.com' },
            { label: 'Cloud Access',     href: 'https://antcpu.com/cloud/' },
          ])}
        </div>
      </div>

      {/* Bottom bar — full width */}
      <div style={{ borderTop: '1px solid #111', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#2a2a2a' }}>
          © {year} ANTCPU ADS · Built by Antony Ciccone · Thomasville, NC
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="mailto:antcpu@gmail.com" style={{ fontSize: '0.7rem', color: '#333', textDecoration: 'none' }}>✉️ Contact</a>
          <a href="https://discord.gg/antcpu" target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#333', textDecoration: 'none' }}>💬 Discord</a>
          <span onClick={() => nav('/tos')} style={{ fontSize: '0.7rem', color: '#333', cursor: 'pointer' }}>Terms</span>
          <span onClick={() => nav('/privacy')} style={{ fontSize: '0.7rem', color: '#333', cursor: 'pointer' }}>Privacy</span>
          <span style={{ fontSize: '0.7rem', color: accent, fontWeight: 700 }}>⚡ {brand}</span>
        </div>
      </div>

    </footer>
  );
}

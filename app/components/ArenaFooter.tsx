'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function ArenaFooter({ brand = 'ANTCPU ADS', accent = '#f0883e' }: { brand?: string; accent?: string }) {
  const router = useRouter();
  const year = new Date().getFullYear();

  const nav = (href: string) => {
    if (href.startsWith('http')) { window.open(href, '_blank'); return; }
    router.push(href);
  };

  const link = (label: string, href: string) => (
    <div key={label} onClick={() => nav(href)}
      style={{ fontSize: '0.82rem', color: '#444', cursor: 'pointer', marginBottom: '0.5rem', transition: 'color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.color = accent)}
      onMouseLeave={e => (e.currentTarget.style.color = '#444')}
    >{label}</div>
  );

  const col = (title: string, items: { label: string; href: string }[]) => (
    <div key={title} style={{ minWidth: '140px' }}>
      <div style={{ fontSize: '0.65rem', color: '#2a2a2a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.85rem', fontWeight: 700 }}>{title}</div>
      {items.map(i => link(i.label, i.href))}
    </div>
  );

  return (
    <footer style={{ borderTop: '1px solid #111', background: '#0a0a0a', padding: '3rem 2rem 1.5rem', marginTop: '3rem', width: '100%', boxSizing: 'border-box' }}>

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2.5rem', marginBottom: '2.5rem' }}>

        {/* Brand block */}
        <div style={{ minWidth: '200px', maxWidth: '260px' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: '0.5rem' }}>⚡ ANTCPU ADS</div>
          <div style={{ fontSize: '0.75rem', color: '#333', lineHeight: 1.7, marginBottom: '1rem' }}>
            Automated marketing powered by AI antbots. Veteran-built. Free 3-day trial.
          </div>
          <div onClick={() => nav('/mapofpi')}
            style={{ display: 'inline-block', background: 'none', border: `1px solid ${accent}50`, color: accent, borderRadius: '7px', padding: '0.4rem 0.9rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            🏆 Country Champion →
          </div>
        </div>

        {/* Link columns */}
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          {col('Product', [
            { label: 'The Arena',    href: '/arena' },
            { label: 'Antbots',      href: '/antbots' },
            { label: 'Talk to Aria', href: '/antbots/chat' },
            { label: 'Create Ad',    href: '/create-ad' },
            { label: 'Dashboard',    href: '/dashboard/user' },
            { label: 'Profile',      href: '/profile' },
          ])}
          {col('Brands', [
            { label: 'ANTCPU ADS',         href: '/arena/antcpu' },
            { label: 'Map of Pi',          href: '/arena/mapofpi' },
            { label: 'Amanda Photography', href: '/arena/amanda' },
            { label: 'PiPioneersX',        href: '/arena/pipioneers' },
          ])}
          {col('Company', [
            { label: 'About',          href: '/about' },
            { label: 'Map of Pi',      href: '/mapofpi' },
            { label: 'antcpu.com',     href: 'https://antcpu.com' },
            { label: 'ANTCPU Cloud',   href: 'https://antcpu.com/cloud/' },
            { label: 'Terms',          href: '/tos' },
            { label: 'Privacy',        href: '/privacy' },
          ])}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid #111', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#2a2a2a' }}>
          © {year} ANTCPU ADS · Built by Antony Ciccone · Thomasville, NC
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="mailto:antcpu@gmail.com" style={{ fontSize: '0.7rem', color: '#333', textDecoration: 'none' }}>✉️ Contact</a>
          <a href="https://discord.gg/antcpu" target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#333', textDecoration: 'none' }}>💬 Discord</a>
          <span style={{ fontSize: '0.7rem', color: accent, fontWeight: 700 }}>⚡ {brand}</span>
        </div>
      </div>

    </footer>
  );
}

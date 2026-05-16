'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeLabels, localeNames, Locale } from '../lib/i18n/index';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Detect current locale from pathname
  const current: Locale = (locales.find(l => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) || 'en') as Locale;

  function handleSelect(l: Locale) {
    setOpen(false);
    if (l === 'en') {
      router.push('/');
    } else {
      router.push(`/${l}`);
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent',
          border: '1px solid #333',
          borderRadius: '8px',
          color: '#888',
          fontSize: '13px',
          fontWeight: 600,
          padding: '6px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          letterSpacing: '0.5px',
        }}
      >
        {localeLabels[current]} <span style={{ fontSize: '10px' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '110%',
          right: 0,
          background: '#111',
          border: '1px solid #222',
          borderRadius: '10px',
          overflow: 'hidden',
          zIndex: 200,
          minWidth: '140px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => handleSelect(l)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                background: current === l ? '#1a1a1a' : 'transparent',
                border: 'none',
                borderBottom: '1px solid #1a1a1a',
                color: current === l ? '#fff' : '#888',
                fontSize: '13px',
                fontWeight: current === l ? 700 : 400,
                padding: '10px 16px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '11px', letterSpacing: '1px', color: '#0070f3', fontWeight: 700 }}>
                {localeLabels[l]}
              </span>
              <span>{localeNames[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


'use client';

import { useState, useEffect }                        from 'react';
import { useRouter, usePathname }                     from 'next/navigation';
import { locales, localeLabels, localeNames, Locale } from '../lib/i18n/index';
import { setStoredLocale, getStoredLocale }           from '../lib/locale';

export default function LanguageSwitcher() {
  const router   = useRouter();
  const pathname = usePathname();
  const [open,         setOpen]         = useState(false);
  const [storedLocale, setStoredLocale_] = useState<Locale>('en');

  // Read stored locale on mount — so button reflects choice on root /
  useEffect(() => {
    setStoredLocale_(getStoredLocale());
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside() { setOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Derive current locale — pathname takes priority, stored locale is fallback
  const current: Locale = locales.find(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  ) ?? storedLocale;

  function handleSelect(l: Locale) {
    setOpen(false);
    setStoredLocale(l);
    setStoredLocale_(l);
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
          background:    'transparent',
          border:        '1px solid #333',
          borderRadius:  '8px',
          color:         '#888',
          fontSize:      '13px',
          fontWeight:    600,
          padding:       '6px 12px',
          cursor:        'pointer',
          display:       'flex',
          alignItems:    'center',
          gap:           '6px',
          letterSpacing: '0.5px',
        }}
      >
        {localeLabels[current]} <span style={{ fontSize: '10px' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:  'absolute',
          top:       '110%',
          right:     0,
          background:'#111',
          border:    '1px solid #222',
          borderRadius: '10px',
          overflow:  'hidden',
          zIndex:    200,
          minWidth:  '140px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => handleSelect(l)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '10px',
                width:        '100%',
                background:   current === l ? '#1a1a1a' : 'transparent',
                border:       'none',
                borderBottom: '1px solid #1a1a1a',
                color:        current === l ? '#fff' : '#888',
                fontSize:     '13px',
                fontWeight:   current === l ? 700 : 400,
                padding:      '10px 16px',
                cursor:       'pointer',
                textAlign:    'left',
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

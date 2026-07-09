// ============================================================
// components/PhaseUnlockStrip.tsx
// Reusable phase progress strip for any brand
// Used by: mapofpi/icons/arena, future brand pages
// ============================================================
'use client';

import { Phase } from '../clients/mapofpi/assets';

type Props = {
  phases:       Phase[];
  currentCount: number;
  accentColor?: string;
  goldColor?:   string;
};

export default function PhaseUnlockStrip({
  phases,
  currentCount,
  accentColor = '#2E7D32',
  goldColor   = '#D4AF37',
}: Props) {
  const current  = phases.reduce((acc, p) => currentCount >= p.unlockAt ? p : acc, phases[0]);
  const next     = phases.find(p => currentCount < p.unlockAt);
  const progress = next ? Math.min((currentCount / next.unlockAt) * 100, 100) : 100;

  return (
    <div style={{ background: `${accentColor}08`, borderBottom: `1px solid ${accentColor}20`, padding: '1rem 1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Label row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: accentColor, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {current.label}
          </div>
          {next && (
            <div style={{ fontSize: '0.68rem', color: '#555' }}>
              {next.unlockAt - currentCount} more to unlock:{' '}
              <span style={{ color: goldColor }}>{next.label}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', background: '#222', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.75rem' }}>
          <div style={{
            height: '100%',
            background: `linear-gradient(90deg, ${accentColor}, ${goldColor})`,
            width: `${progress}%`,
            transition: 'width 0.6s ease',
            borderRadius: '999px',
          }} />
        </div>

        {/* Phase pills */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {phases.map(p => (
            <div
              key={p.id}
              title={p.description}
              style={{
                flexShrink:   0,
                background:   currentCount >= p.unlockAt ? `${accentColor}20` : '#111',
                border:       `1px solid ${currentCount >= p.unlockAt ? accentColor + '50' : '#1a1a1a'}`,
                borderRadius: '999px',
                padding:      '0.25rem 0.75rem',
                fontSize:     '0.65rem',
                color:        currentCount >= p.unlockAt ? accentColor : '#444',
                whiteSpace:   'nowrap',
                cursor:       'default',
              }}
            >
              {p.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

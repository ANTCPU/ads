// ============================================================
// components/AntbotLaunchGrid.tsx
// 10-bot launch animation grid + pod summary pills
// Used by: create-shop-ad step 5, future dashboard runner
// ============================================================
'use client';

const green  = '#2E7D32';
const gold   = '#D4AF37';
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#888';
const muted2 = '#444';

const BOTS = [
  { id: 'ANT-01', channel: 'Brand Awareness', icon: '📡' },
  { id: 'ANT-02', channel: 'Google Ads',       icon: '🔍' },
  { id: 'ANT-03', channel: 'Instagram',        icon: '📸' },
  { id: 'ANT-04', channel: 'Twitter / X',      icon: '🐦' },
  { id: 'ANT-05', channel: 'Reddit',           icon: '👾' },
  { id: 'ANT-06', channel: 'YouTube',          icon: '🎬' },
  { id: 'ANT-07', channel: 'TikTok',           icon: '🎵' },
  { id: 'ANT-08', channel: 'SEO / Content',    icon: '📝' },
  { id: 'ANT-09', channel: 'Discord',          icon: '💬' },
  { id: 'ANT-10', channel: 'Email',            icon: '📧' },
];

type Props = {
  activeBot:   number;   // index currently animating
  launched:    boolean;  // true = all done, all green
  launching:   boolean;  // true = animation in progress
  accentColor?: string;
};

export default function AntbotLaunchGrid({
  activeBot,
  launched,
  launching,
  accentColor = green,
}: Props) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', margin: '1.5rem 0' }}>
        {BOTS.map((bot, i) => {
          const done   = launched || i < activeBot;
          const active = !launched && i === activeBot && launching;
          return (
            <div key={bot.id} style={{
              background:   done ? `${accentColor}22` : active ? `${gold}15` : card,
              border:       `1px solid ${done ? accentColor : active ? gold : border}`,
              borderRadius: '10px',
              padding:      '0.6rem 0.25rem',
              textAlign:    'center',
              transition:   'all 0.3s',
            }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.2rem', animation: active ? 'mac-pulse 0.8s ease-in-out infinite' : 'none' }}>
                {bot.icon}
              </div>
              <div style={{ fontSize: '0.55rem', color: done ? accentColor : active ? gold : muted, fontWeight: 600, lineHeight: 1.2 }}>
                {bot.id}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pod summary pills — shown after launch */}
      {launched && (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          <div style={{ fontSize: '0.65rem', color: accentColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Your Pod
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {BOTS.map(b => (
              <span key={b.id} style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30`, borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.65rem', color: accentColor }}>
                {b.icon} {b.channel}
              </span>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes mac-pulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

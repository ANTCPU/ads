'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { notifyDiscord } from '../../lib/discord';
import { MAPOFPI_ICONS, MAPOFPI_COUNTRIES } from '../../clients/mapofpi/assets';
import MacChatOverlay from '../../components/MacChatOverlay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const green  = '#2E7D32';
const gold   = '#D4AF37';
const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const white  = '#fff';
const muted  = '#888';
const muted2 = '#444';

const ANTBOTS = [
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

const ARIA_LINES: Record<string, string> = {
  en: '🦋 Aria here — your campaign is live. All 10 antbots are running your shop across the network.',
  hi: '🦋 अरिया यहाँ हूँ — आपका अभियान लाइव है। सभी 10 एंटबॉट्स आपकी दुकान को नेटवर्क पर चला रहे हैं।',
  pt: '🦋 Aria aqui — sua campanha está ao vivo. Todos os 10 antbots estão rodando sua loja na rede.',
  es: '🦋 Aria aquí — tu campaña está en vivo. Los 10 antbots están ejecutando tu tienda en la red.',
  fr: '🦋 Aria ici — votre campagne est en direct. Les 10 antbots font tourner votre boutique sur le réseau.',
  ar: '🦋 أريا هنا — حملتك مباشرة الآن. جميع الـ 10 روبوتات تعمل على نشر متجرك عبر الشبكة.',
  zh: '🦋 Aria 在此 — 您的广告活动已上线。10 个蚂蚁机器人正在网络上运行您的店铺。',
  id: '🦋 Aria di sini — kampanye Anda sudah live. Semua 10 antbot menjalankan toko Anda di seluruh jaringan.',
  vi: '🦋 Aria đây — chiến dịch của bạn đã phát sóng. Tất cả 10 antbot đang chạy cửa hàng của bạn trên mạng.',
  ko: '🦋 Aria입니다 — 캠페인이 시작되었습니다. 10개의 앤트봇이 네트워크 전체에서 귀하의 가게를 운영하고 있습니다.',
  ja: '🦋 Ariaです — キャンペーンが開始されました。10台のアントボットがネットワーク全体であなたのショップを運営しています。',
  de: '🦋 Aria hier — Ihre Kampagne ist live. Alle 10 Antbots betreiben Ihren Shop im Netzwerk.',
};

type Step = 1 | 2 | 3 | 4 | 5;

export default function CreateShopAdPage() {
  const [step,        setStep]        = useState<Step>(1);
  const [shopType,    setShopType]    = useState('');
  const [shopName,    setShopName]    = useState('');
  const [country,     setCountry]     = useState('');
  const [language,    setLanguage]    = useState('en');
  const [description, setDescription] = useState('');
  const [macOpen,     setMacOpen]     = useState(false);
  const [macField,    setMacField]    = useState('default');
  const [launching,   setLaunching]   = useState(false);
  const [launched,    setLaunched]    = useState(false);
  const [activeBot,   setActiveBot]   = useState(0);
  const [ariaMsg,     setAriaMsg]     = useState('');
  const [user,        setUser]        = useState({ name: '', email: '', brand: 'Map of Pi', trialStatus: 'team' });
  const [descHint,    setDescHint]    = useState('');
  const [loadingHint, setLoadingHint] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
  }, []);

  useEffect(() => {
    if (country) return;
    const code = (navigator.language || 'en-US').split('-')[1]?.toUpperCase() || '';
    const match = MAPOFPI_COUNTRIES.find(c => c.code === code);
    if (match) { setCountry(match.code); setLanguage(match.lang); }
  }, []);

  async function fetchDescHint() {
    if (!shopType || !shopName || loadingHint) return;
    setLoadingHint(true);
    const icon = MAPOFPI_ICONS.find(i => i.slug === shopType);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Write a 1-sentence shop description (max 100 chars) for a Map of Pi seller. Shop type: ${icon?.label}. Shop name: ${shopName}. Language: ${language}. Output only the description, no quotes.`,
          system: 'You are Aria, the ANTCPU ADS agent. Output only the requested copy. No preamble.',
        }),
      });
      const d = await res.json();
      setDescHint(d.reply || d.message || '');
    } catch {}
    setLoadingHint(false);
  }

  async function handleLaunch() {
    if (!shopType || !shopName || !country || !description.trim()) return;
    setLaunching(true);
    setStep(5);

    const sel  = MAPOFPI_COUNTRIES.find(c => c.code === country);
    const icon = MAPOFPI_ICONS.find(i => i.slug === shopType);

    await supabase.from('ads').insert([{
      email:        user.email || 'mapofpi@champion.app',
      name:         user.name  || shopName,
      brand:        'Map of Pi',
      title:        `${icon?.emoji} ${shopName} — ${sel?.flag} ${sel?.name}`,
      description:  description.trim(),
      category:     icon?.label || 'General Shop',
      status:       'pending_review',
      trial_status: 'team',
      tier:         'entry',
      image_url:    null,
    }]);

    notifyDiscord(`🗺️ **New Country Champion Ad**\n**Shop:** ${shopName}\n**Type:** ${icon?.label}\n**Country:** ${sel?.flag} ${sel?.name}\n**Email:** ${user.email || 'anonymous'}`);

    for (let i = 0; i < ANTBOTS.length; i++) {
      setActiveBot(i);
      await new Promise(r => setTimeout(r, 380));
    }

    setAriaMsg(ARIA_LINES[language] || ARIA_LINES.en);
    setLaunching(false);
    setLaunched(true);
  }

  function openMac(field: string) { setMacField(field); setMacOpen(true); }

  const selectedIcon    = MAPOFPI_ICONS.find(i => i.slug === shopType);
  const selectedCountry = MAPOFPI_COUNTRIES.find(c => c.code === country);
  const canAdvance      = [
    shopType !== '',
    shopName.trim().length >= 2,
    country !== '',
    description.trim().length >= 10,
  ];

  const macBtn: React.CSSProperties = {
    background: 'none', border: `1px solid ${green}40`, borderRadius: '8px',
    color: green, fontSize: '0.72rem', padding: '0.3rem 0.7rem',
    cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
  };

  const nextBtn = (enabled: boolean): React.CSSProperties => ({
    width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
    background: enabled ? gold : muted2,
    color: enabled ? '#0a0a0a' : muted,
    fontWeight: 800, fontSize: '1rem',
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'background 0.2s', marginTop: '1.5rem',
  });

  const inp: React.CSSProperties = {
    width: '100%', background: card, border: `1px solid ${border}`,
    borderRadius: '10px', padding: '0.85rem 1rem', color: white,
    fontSize: '0.95rem', outline: 'none', fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box',
  };

  const STEP_LABELS = ['Pick your shop type', 'Name your shop', 'Choose your country', 'Describe your shop', 'Launching your campaign'];

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.95rem' }}>
          <span style={{ color: '#0070f3' }}>⚡</span>
          <span>AD NETWORK</span>
          <span style={{ color: muted2, fontWeight: 400 }}>×</span>
          <span>🗺️ Map of Pi</span>
        </div>
        <a href="/mapofpi" style={{ fontSize: '0.8rem', color: muted, textDecoration: 'none' }}>← Back</a>
      </nav>

      {/* PROGRESS BAR */}
      <div style={{ height: '3px', background: muted2 }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg, ${green}, ${gold})`, width: `${(step / 5) * 100}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* STEP LABEL */}
      <div style={{ textAlign: 'center', padding: '1.5rem 1.25rem 0.5rem' }}>
        <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Step {step} of 5
        </div>
        <div style={{ fontSize: '0.8rem', color: muted }}>{STEP_LABELS[step - 1]}</div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: '520px', margin: '1.5rem auto', padding: '0 1.25rem 4rem' }}>

        {/* ── STEP 1 — ICON PICKER ── */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>What kind of shop?</h2>
              <button style={macBtn} onClick={() => openMac('shopType')}>💬 Ask M.A.C.</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {MAPOFPI_ICONS.map(icon => (
                <button
                  key={icon.slug}
                  onClick={() => setShopType(icon.slug)}
                  style={{
                    background:   shopType === icon.slug ? `${green}22` : card,
                    border:       `2px solid ${shopType === icon.slug ? green : border}`,
                    borderRadius: '14px', padding: '1rem 0.5rem',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{icon.emoji}</div>
                  <div style={{ fontSize: '0.68rem', color: shopType === icon.slug ? green : muted, fontWeight: 600, lineHeight: 1.3 }}>{icon.label}</div>
                </button>
              ))}
            </div>
            <button style={nextBtn(canAdvance[0])} onClick={() => canAdvance[0] && setStep(2)}>Continue →</button>
          </div>
        )}

        {/* ── STEP 2 — SHOP NAME ── */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>{selectedIcon?.emoji} What&apos;s your shop called?</h2>
              <button style={macBtn} onClick={() => openMac('shopName')}>💬 Ask M.A.C.</button>
            </div>
            <input style={inp} placeholder="e.g. Mama Ama's Kitchen" value={shopName} onChange={e => setShopName(e.target.value)} maxLength={60} autoFocus />
            <div style={{ fontSize: '0.72rem', color: muted, marginTop: '0.5rem', textAlign: 'right' }}>{shopName.length}/60</div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button style={{ ...nextBtn(true), background: muted2, color: muted, flex: '0 0 auto', width: 'auto', padding: '1rem 1.5rem', marginTop: 0 }} onClick={() => setStep(1)}>← Back</button>
              <button style={{ ...nextBtn(canAdvance[1]), flex: 1, marginTop: 0 }} onClick={() => canAdvance[1] && setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — COUNTRY ── */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>Which country are you representing?</h2>
              <button style={macBtn} onClick={() => openMac('country')}>💬 Ask M.A.C.</button>
            </div>
            {selectedCountry && (
              <div style={{ background: `${green}15`, border: `1px solid ${green}40`, borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: green, fontWeight: 600 }}>
                {selectedCountry.flag} Auto-detected: {selectedCountry.name}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
              {MAPOFPI_COUNTRIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => { setCountry(c.code); setLanguage(c.lang); }}
                  style={{
                    background:   country === c.code ? `${green}22` : card,
                    border:       `1px solid ${country === c.code ? green : border}`,
                    borderRadius: '10px', padding: '0.65rem 0.85rem',
                    cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{c.flag}</span>
                  <span style={{ fontSize: '0.82rem', color: country === c.code ? green : white, fontWeight: country === c.code ? 700 : 400 }}>{c.name}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button style={{ ...nextBtn(true), background: muted2, color: muted, flex: '0 0 auto', width: 'auto', padding: '1rem 1.5rem', marginTop: 0 }} onClick={() => setStep(2)}>← Back</button>
              <button style={{ ...nextBtn(canAdvance[2]), flex: 1, marginTop: 0 }} onClick={() => canAdvance[2] && setStep(4)}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — DESCRIPTION ── */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>Describe your shop</h2>
              <button style={macBtn} onClick={() => openMac('description')}>💬 Ask M.A.C.</button>
            </div>

            {/* Aria hint */}
            <div style={{ marginBottom: '0.75rem' }}>
              {loadingHint ? (
                <div style={{ fontSize: '0.78rem', color: green, padding: '0.5rem 0.75rem', background: `${green}10`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>🦋</span> Aria is writing a suggestion...
                </div>
              ) : descHint ? (
                <div
                  onClick={() => setDescription(descHint)}
                  style={{ fontSize: '0.78rem', color: green, padding: '0.5rem 0.75rem', background: `${green}10`, border: `1px solid ${green}30`, borderRadius: '8px', cursor: 'pointer' }}
                >
                  🦋 Aria suggests: <em>&ldquo;{descHint}&rdquo;</em> <span style={{ color: muted, marginLeft: '4px' }}>tap to use</span>
                </div>
              ) : (
                <button
                  onClick={fetchDescHint}
                  style={{ fontSize: '0.78rem', color: muted, background: 'none', border: `1px solid ${border}`, borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
                >
                  🦋 Ask Aria to suggest a description
                </button>
              )}
            </div>

            <textarea
              ref={descRef}
              style={{ ...inp, resize: 'vertical', minHeight: '100px' } as React.CSSProperties}
              placeholder="Tell people what makes your shop worth visiting..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={120}
              autoFocus
            />
            <div style={{ fontSize: '0.72rem', color: muted, marginTop: '0.5rem', textAlign: 'right' }}>{description.length}/120</div>

            {/* Live preview card */}
            {shopName && shopType && (
              <div style={{ marginTop: '1.25rem', background: '#0d1a0d', border: `1px solid ${green}30`, borderRadius: '14px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Ad Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '2rem' }}>{selectedIcon?.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: white }}>{shopName}</div>
                    <div style={{ fontSize: '0.75rem', color: green }}>{selectedCountry?.flag} {selectedCountry?.name} · {selectedIcon?.label}</div>
                  </div>
                </div>
                {description && <div style={{ fontSize: '0.85rem', color: muted, lineHeight: 1.5 }}>{description}</div>}
                <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: muted2 }}>🗺️ Map of Pi · Entry Tier · 10 antbots ready</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button style={{ ...nextBtn(true), background: muted2, color: muted, flex: '0 0 auto', width: 'auto', padding: '1rem 1.5rem', marginTop: 0 }} onClick={() => setStep(3)}>← Back</button>
              <button style={{ ...nextBtn(canAdvance[3]), flex: 1, marginTop: 0 }} onClick={() => canAdvance[3] && handleLaunch()}>
                🚀 Launch Campaign →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5 — LAUNCH ── */}
        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {launched ? '✅' : '⚡'}
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.5rem' }}>
              {launched ? 'Campaign Live!' : 'Launching your antbots...'}
            </h2>

            {/* Antbot animation grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', margin: '1.5rem 0' }}>
              {ANTBOTS.map((bot, i) => {
                const done    = launched || i < activeBot;
                const active  = !launched && i === activeBot && launching;
                return (
                  <div
                    key={bot.id}
                    style={{
                      background:   done ? `${green}22` : active ? `${gold}15` : card,
                      border:       `1px solid ${done ? green : active ? gold : border}`,
                      borderRadius: '10px', padding: '0.6rem 0.25rem',
                      textAlign:    'center', transition: 'all 0.3s',
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', marginBottom: '0.2rem', animation: active ? 'mac-pulse 0.8s ease-in-out infinite' : 'none' }}>{bot.icon}</div>
                    <div style={{ fontSize: '0.55rem', color: done ? green : active ? gold : muted, fontWeight: 600, lineHeight: 1.2 }}>{bot.id}</div>
                  </div>
                );
              })}
            </div>

            {/* Aria message — in user's language */}
            {ariaMsg && (
              <div style={{ background: `${green}15`, border: `1px solid ${green}40`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#ccc', lineHeight: 1.6, textAlign: 'left' }}>
                {ariaMsg}
              </div>
            )}

            {/* Post-launch CTAs */}
            {launched && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a href="/mapofpi/icons/arena" style={{ display: 'block', background: green, color: white, padding: '1rem', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', fontSize: '1rem' }}>
                  🗺️ View Country Champions Arena →
                </a>
                <a href="/arena" style={{ display: 'block', background: 'transparent', color: muted, padding: '0.85rem', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem', border: `1px solid ${border}` }}>
                  View the full Arena →
                </a>
                <button
                  onClick={() => { setStep(1); setShopType(''); setShopName(''); setCountry(''); setDescription(''); setLaunched(false); setAriaMsg(''); setActiveBot(0); }}
                  style={{ background: 'none', border: 'none', color: muted2, cursor: 'pointer', fontSize: '0.8rem', padding: '0.5rem' }}
                >
                  + Create another shop ad
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* M.A.C. Overlay */}
      <MacChatOverlay
        open={macOpen}
        onClose={() => setMacOpen(false)}
        fieldContext={macField}
        language={language}
        brandContext="Map of Pi"
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes mac-pulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

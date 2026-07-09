// ============================================================
// mapofpi/create-shop-ad/page.tsx
// 5-step shop ad builder for Map of Pi Country Champions
// Step 1: Shop type icon picker
// Step 2: Shop name
// Step 3: Country + language (sets antbot locale)
// Step 4: Description (Aria-assisted, in chosen language)
// Step 5: Antbot launch animation → live Aria feedback
// ============================================================
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

// ── Brand tokens ─────────────────────────────────────────────
const green  = '#2E7D32';
const gold   = '#D4AF37';
const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const white  = '#fff';
const muted  = '#888';
const muted2 = '#444';

// ── Antbot names for the launch animation ───────────────────
const ANTBOTS = [
  { id: 'ANT-01', channel: 'Brand Awareness',   icon: '📡' },
  { id: 'ANT-02', channel: 'Google Ads',         icon: '🔍' },
  { id: 'ANT-03', channel: 'Instagram',          icon: '📸' },
  { id: 'ANT-04', channel: 'Twitter / X',        icon: '🐦' },
  { id: 'ANT-05', channel: 'Reddit',             icon: '👾' },
  { id: 'ANT-06', channel: 'YouTube',            icon: '🎬' },
  { id: 'ANT-07', channel: 'TikTok',             icon: '🎵' },
  { id: 'ANT-08', channel: 'SEO / Content',      icon: '📝' },
  { id: 'ANT-09', channel: 'Discord',            icon: '💬' },
  { id: 'ANT-10', channel: 'Email',              icon: '📧' },
];

// ── Aria feedback per language ───────────────────────────────
// Shown while antbots spin — localised opening line
const ARIA_LAUNCH_LINES: Record<string, string> = {
  en: "🦋 Aria here — your campaign is live. All 10 antbots are running your shop across the network.",
  hi: "🦋 अरिया यहाँ हूँ — आपका अभियान लाइव है। सभी 10 एंटबॉट्स आपकी दुकान को नेटवर्क पर चला रहे हैं।",
  pt: "🦋 Aria aqui — sua campanha está ao vivo. Todos os 10 antbots estão rodando sua loja na rede.",
  es: "🦋 Aria aquí — tu campaña está en vivo. Los 10 antbots están ejecutando tu tienda en la red.",
  fr: "🦋 Aria ici — votre campagne est en direct. Les 10 antbots font tourner votre boutique sur le réseau.",
  ar: "🦋 أريا هنا — حملتك مباشرة الآن. جميع الـ 10 روبوتات تعمل على نشر متجرك عبر الشبكة.",
  zh: "🦋 Aria 在此 — 您的广告活动已上线。10 个蚂蚁机器人正在网络上运行您的店铺。",
  id: "🦋 Aria di sini — kampanye Anda sudah live. Semua 10 antbot menjalankan toko Anda di seluruh jaringan.",
  vi: "🦋 Aria đây — chiến dịch của bạn đã phát sóng. Tất cả 10 antbot đang chạy cửa hàng của bạn trên mạng.",
  ko: "🦋 Aria입니다 — 캠페인이 시작되었습니다. 10개의 앤트봇이 네트워크 전체에서 귀하의 가게를 운영하고 있습니다.",
  ja: "🦋 Ariaです — キャンペーンが開始されました。10台のアントボットがネットワーク全体であなたのショップを運営しています。",
  de: "🦋 Aria hier — Ihre Kampagne ist live. Alle 10 Antbots betreiben Ihren Shop im Netzwerk.",
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

  // Load user from localStorage (set by VaultModal on login)
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
  }, []);

  // Auto-detect country from browser locale
  useEffect(() => {
    if (country) return;
    const locale = navigator.language || 'en-US';
    const code = locale.split('-')[1]?.toUpperCase() || '';
    const match = MAPOFPI_COUNTRIES.find(c => c.code === code);
    if (match) { setCountry(match.code); setLanguage(match.lang); }
  }, []);

  // Aria description hint — fires when shopType + shopName are set and user focuses description
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

  // Launch sequence — animates through all 10 antbots then shows Aria message
  async function handleLaunch() {
    if (!shopType || !shopName || !country || !description.trim()) return;
    setLaunching(true);
    setStep(5);

    // Submit to Supabase
    const selectedCountry = MAPOFPI_COUNTRIES.find(c => c.code === country);
    const icon = MAPOFPI_ICONS.find(i => i.slug === shopType);
    const adTitle = `${icon?.emoji} ${shopName} — ${selectedCountry?.flag} ${selectedCountry?.name}`;

    await supabase.from('ads').insert([{
      email:        user.email || 'mapofpi@champion.app',
      name:         user.name  || shopName,
      brand:        'Map of Pi',
      title:        adTitle,
      description:  description.trim(),
      category:     icon?.label || 'General Shop',
      status:       'pending_review',
      trial_status: 'team',
      tier:         'entry',
      image_url:    null,
    }]);

    notifyDiscord(`🗺️ **New Country Champion Ad**\n**Shop:** ${shopName}\n**Type:** ${icon?.label}\n**Country:** ${selectedCountry?.flag} ${selectedCountry?.name}\n**Email:** ${user.email || 'anonymous'}`);

    // Animate antbots one by one
    for (let i = 0; i < ANTBOTS.length; i++) {
      setActiveBot(i);
      await new Promise(r => setTimeout(r, 380));
    }

    // Show Aria message in user's language
    setAriaMsg(ARIA_LAUNCH_LINES[language] || ARIA_LAUNCH_LINES.en);
    setLaunching(false);
    setLaunched(true);
  }

  function openMac(field: string) {
    setMacField(field);
    setMacOpen(true);
  }

  const selectedIcon    = MAPOFPI_ICONS.find(i => i.slug === shopType);
  const selectedCountry = MAPOFPI_COUNTRIES.find(c => c.code === country);
  const canAdvance = [
    shopType !== '',
    shopName.trim().length >= 2,
    country !== '',
    description.trim().length >= 10,
  ];

  // ── Shared styles ─────────────────────────────────────────
  const macBtn: React.CSSProperties = {
    background: 'none', border: `1px solid ${green}40`, borderRadius: '8px',
    color: green, fontSize: '0.72rem', padding: '0.3rem 0.7rem',
    cursor: 'pointer', fontWeight: 600, letterSpacing: '0.02em',
    display: 'flex', alignItems: 'center', gap: '4px',
  };
  const nextBtn = (enabled: boolean): React.CSSProperties => ({
    width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
    background: enabled ? gold : muted2,
    color: enabled ? '#0a0a0a' : muted,
    fontWeight: 800, fontSize: '1rem',
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'background 0.2s',
    marginTop: '1.5rem',
  });
  const inp: React.CSSProperties = {
    width: '100%', background: card, border: `1px solid ${border}`,
    borderRadius: '10px', padding: '0.85rem 1rem', color: white,
    fontSize: '0.95rem', outline: 'none', fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.95rem' }}>
          <span style={{ color: '#0070f3' }}>⚡</span>
          <span>AD NETWORK</span>
          <span style={{ color: muted2, fontWeight: 400 }}>×</span>
          <span>🗺️ Map of Pi</span>
        </div>
        <a href="/mapofpi" style={{ fontSize: '0.8rem', color: muted, textDecoration: 'none' }}>← Back</a>
      </nav>

      {/* ── PROGRESS BAR ── */}
      <div style={{ height: '3px', background: muted2 }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg, ${green}, ${gold})`, width: `${(step / 5) * 100}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* ── STEP LABEL ── */}
      <div style={{ textAlign: 'center', padding: '1.5rem 1.25rem 0.5rem' }}>
        <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Step {step} of 5
        </div>
        <div style={{ fontSize: '0.8rem', color: muted }}>
          {['Pick your shop type', 'Name your shop', 'Choose your country', 'Describe your shop', 'Launching your campaign'][step - 1]}
        </div>
      </div>

      {/* ── MAIN CARD ── */}
      <div style={{ maxWidth: '520px', margin: '1.5rem auto', padding: '0 1.25rem 4rem' }}>

        {/* ════ STEP 1 — ICON PICKER ════ */}
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
                    borderRadius: '14px',
                    padding:      '1rem 0.5rem',
                    cursor:       'pointer',
                    textAlign:    'center',
                    transition:   'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{icon.emoji}</div>
                  <div style={{ fontSize: '0.68rem', color: shopType === icon.slug ? green : muted, fontWeight: 600, lineHeight: 1.3 }}>{icon.label}</div>
                </button>
              ))}
            </div>
            <button style={nextBtn(canAdvance[0])} onClick={() => canAdvance[0] && setStep(2)}>
              Continue →
            </button>
          </div>
        )}

        {/* ════ STEP 2 — SHOP NAME ════ */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>
                {selectedIcon?.emoji} What's your shop called?
              </h2>
              <button style={macBtn} onClick={() => openMac('shopName')}>💬 Ask M.A.C.</button>
            </div>
            <input
              style={inp}
              placeholder="e.g. Mama Ama's Kitchen"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              maxLength={60}
              autoFocus
            />
            <div style={{ fontSize: '0.72rem', color: muted, marginTop: '0.5rem', textAlign: 'right' }}>{shopName.length}/60</div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button style={{ ...nextBtn(true), background: muted2, color: muted, flex: '0 0 auto', width: 'auto', padding: '1rem 1.5rem' }} onClick={() => setStep(1)}>← Back</button>
              <button style={{ ...nextBtn(canAdvance[1]), flex: 1, marginTop: 0 }} onClick={() => canAdvance[1] && setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* ════ STEP 3 — COUNTRY ════ */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>Which country are you representing?</h2>
              <button style={macBtn} onClick={() => openMac('country')

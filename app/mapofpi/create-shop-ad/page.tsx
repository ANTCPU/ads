'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { notifyDiscord, DC } from '../../lib/discord';
import { sanitizeDescription, containsUrl } from '../../lib/sanitize';
import { getAriaLine } from '../../lib/ariaLines';
import { tokens, inp, nextBtn, backBtn, macBtn } from '../../lib/shopAdStyles';
import { buildPod } from '../../antbots/index';
import { MAPOFPI_ICONS, MAPOFPI_COUNTRIES } from '../../clients/mapofpi/assets';
import CountryPicker from '../../components/CountryPicker';
import AntbotLaunchGrid from '../../components/AntbotLaunchGrid';
import MacChatOverlay from '../../components/MacChatOverlay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const { green, gold, bg, card, border, white, muted, muted2 } = tokens;
type Step = 0 | 1 | 2 | 3 | 4 | 5;

export default function CreateShopAdPage() {
  const [step, setStep] = useState<Step>(0);
  const [shopType,    setShopType]    = useState('');
  const [shopName,    setShopName]    = useState('');
  const [country,     setCountry]     = useState('');
  const [language,    setLanguage]    = useState('en');
  const [description, setDescription] = useState('');
  const [urlWarning,  setUrlWarning]  = useState(false);
  const [macOpen,     setMacOpen]     = useState(false);
  const [macField,    setMacField]    = useState('default');
  const [launching,   setLaunching]   = useState(false);
  const [launched,    setLaunched]    = useState(false);
  const [activeBot,   setActiveBot]   = useState(0);
  const [ariaMsg,     setAriaMsg]     = useState('');
  const [descHint,    setDescHint]    = useState('');
  const [loadingHint, setLoadingHint] = useState(false);
  const [user,        setUser]        = useState({ name: '', email: '', brand: 'Map of Pi', trialStatus: 'team' });

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

  function handleDescChange(raw: string) {
    setUrlWarning(containsUrl(raw));
    setDescription(sanitizeDescription(raw));
  }

  async function fetchDescHint() {
    if (!shopType || !shopName || loadingHint) return;
    setLoadingHint(true);
    const icon = MAPOFPI_ICONS.find(i => i.slug === shopType);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Write a 1-sentence shop description (max 100 chars) for a Map of Pi seller. Shop type: ${icon?.label}. Shop name: ${shopName}. Language: ${language}. Output only the description, no quotes, no URLs.`,
          system: 'You are Aria. Output only the requested copy. No preamble. Never include URLs.',
        }),
      });
      const d = await res.json();
      setDescHint(sanitizeDescription(d.reply || d.message || ''));
    } catch {}
    setLoadingHint(false);
  }

  async function handleLaunch() {
    if (!shopType || !shopName || !country || !description.trim()) return;
    setLaunching(true);
    setStep(5);

    const sel       = MAPOFPI_COUNTRIES.find(c => c.code === country);
    const icon      = MAPOFPI_ICONS.find(i => i.slug === shopType);
    const cleanDesc = sanitizeDescription(description);

    const pod = buildPod({
      brand: 'Map of Pi', shopName,
      shopType: icon?.label || 'General Shop',
      shopEmoji: icon?.emoji || '📦',
      country: sel?.name || '', countryFlag: sel?.flag || '',
      language, youtubeAnthemId: 'PNoY1ffzciI',
    });

    const { data: inserted } = await supabase.from('ads').insert([{
      email:        user.email || 'ghost@mapofpi.invalid',
      name:         user.name  || shopName,
      brand:        'Map of Pi',
      title:        `${icon?.emoji} ${shopName} — ${sel?.flag} ${sel?.name}`,
      description:  cleanDesc,
      category:     icon?.label || 'General Shop',
      status:       'active',
      trial_status: 'team',
      tier:         'entry',
      image_url:    null,
    }]).select('id').single();

    if (inserted?.id) {
      try {
        await supabase.from('antbot_pods').insert([{
          ad_id: inserted.id, email: user.email || 'unknown@mapofpi',
          brand: 'Map of Pi', country: sel?.name || '', language,
          pod_json: JSON.stringify(pod.map(b => ({ id: b.id, channel: b.channel, task: b.task }))),
        }]);
      } catch {}
    }
    // ← INSERT HERE — register champion in ad_signups
    await supabase.from('ad_signups').upsert([{
      email:               user.email || 'ghost@mapofpi.invalid',
      name:                user.name  || shopName,
      brand_name:          'Map of Pi',
      status:              'team',
      role:                'user',
      trial_days:          90,
      promo_code:          'MAPOFPI',
      is_country_champion: true,
      champion_since:      new Date().toISOString(),
      country:             sel?.name || '',
    }], { onConflict: 'email' });

    notifyDiscord('', 'new_champion', {
    notifyDiscord('', 'new_champion', {
  title: '🗺️ New Country Champion',
  color: DC.gold,
  fields: [
    { name: 'Shop',     value: shopName,                        inline: true },
    { name: 'Type',     value: icon?.label || 'General Shop',  inline: true },
    { name: 'Country',  value: `${sel?.flag} ${sel?.name}`,    inline: true },
    { name: 'Language', value: language.toUpperCase(),         inline: true },
    { name: 'Email',    value: user.email || 'unknown',        inline: false },
  ],
  footer: 'ANTCPU ADS · Country Champions',
  timestamp: true,
});

    for (let i = 0; i < 10; i++) {
      setActiveBot(i);
      await new Promise(r => setTimeout(r, 380));
    }

    setAriaMsg(getAriaLine(language));
    setLaunching(false);
    setLaunched(true);
    localStorage.setItem('arena_user', JSON.stringify({
  ...user,
  name: user.name || shopName,
  brand: 'Map of Pi',
  trialStatus: 'team',
}));

  }

  function resetAll() {
    setStep(1); setShopType(''); setShopName(''); setCountry('');
    setDescription(''); setLaunched(false); setAriaMsg('');
    setActiveBot(0); setDescHint(''); setUrlWarning(false);
  }

  const selectedIcon    = MAPOFPI_ICONS.find(i => i.slug === shopType);
  const selectedCountry = MAPOFPI_COUNTRIES.find(c => c.code === country);
  const canAdvance      = [shopType !== '', shopName.trim().length >= 2, country !== '', description.trim().length >= 10];
  const STEP_LABELS = ['Your details', 'Pick your shop type', 'Name your shop', 'Choose your country', 'Describe your shop', 'Launching your campaign'];

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.95rem' }}>
          <span style={{ color: '#0070f3' }}>⚡</span><span>AD NETWORK</span>
          <span style={{ color: muted2, fontWeight: 400 }}>×</span>
          <span style={{ color: green }}>🗺️ Map of Pi</span>
        </div>
        <a href="/mapofpi" style={{ fontSize: '0.8rem', color: muted, textDecoration: 'none' }}>← Back</a>
      </nav>

      {/* PROGRESS */}
      <div style={{ height: '3px', background: muted2 }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg, ${green}, ${gold})`, width: `${((step + 1) / 6) * 100}%`, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
  Step {step + 1} of 6
</div>
<div style={{ fontSize: '0.8rem', color: muted }}>{STEP_LABELS[step]}</div>

      <div style={{ maxWidth: '520px', margin: '1.5rem auto', padding: '0 1.25rem 4rem' }}>

        {/* STEP 0 — EMAIL GATE */}
{step === 0 && (
  <div>
    <h2 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.5rem' }}>Who's claiming this country?</h2>
    <p style={{ color: muted, fontSize: '0.88rem', marginBottom: '1.5rem' }}>We'll send your campaign confirmation here.</p>
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.75rem', color: muted, display: 'block', marginBottom: '0.4rem' }}>Your Name</label>
      <input
        style={inp}
        placeholder="e.g. Antony"
        value={user.name}
        onChange={e => setUser(u => ({ ...u, name: e.target.value }))}
        autoFocus
      />
    </div>
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ fontSize: '0.75rem', color: muted, display: 'block', marginBottom: '0.4rem' }}>Your Email</label>
      <input
        style={inp}
        type="email"
        placeholder="you@example.com"
        value={user.email}
        onChange={e => setUser(u => ({ ...u, email: e.target.value }))}
      />
    </div>
    <button
      style={{ ...nextBtn(user.name.trim().length >= 2 && user.email.includes('@')), width: '100%' }}
      onClick={() => {
        if (user.name.trim().length >= 2 && user.email.includes('@')) {
          localStorage.setItem('arena_user', JSON.stringify(user));
          setStep(1);
        }
      }}
    >
      Continue →
    </button>
  </div>
)}

        
        {/* STEP 1 — ICON PICKER */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>What kind of shop?</h2>
              <button style={macBtn} onClick={() => { setMacField('shopType'); setMacOpen(true); }}>💬 Ask M.A.C.</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {MAPOFPI_ICONS.map(icon => (
                <button key={icon.slug} onClick={() => setShopType(icon.slug)} style={{
                  background: shopType === icon.slug ? `${green}22` : card,
                  border: `2px solid ${shopType === icon.slug ? green : border}`,
                  borderRadius: '14px', padding: '1rem 0.5rem', cursor: 'pointer', textAlign: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{icon.emoji}</div>
                  <div style={{ fontSize: '0.68rem', color: shopType === icon.slug ? green : muted, fontWeight: 600 }}>{icon.label}</div>
                </button>
              ))}
            </div>
            <button style={nextBtn(canAdvance[0])} onClick={() => canAdvance[0] && setStep(2)}>Continue →</button>
          </div>
        )}

        {/* STEP 2 — SHOP NAME */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>{selectedIcon?.emoji} What&apos;s your shop called?</h2>
              <button style={macBtn} onClick={() => { setMacField('shopName'); setMacOpen(true); }}>💬 Ask M.A.C.</button>
            </div>
            <input style={inp} placeholder="e.g. Mama Ama's Kitchen" value={shopName} onChange={e => setShopName(e.target.value)} maxLength={60} autoFocus />
            <div style={{ fontSize: '0.72rem', color: muted, marginTop: '0.5rem', textAlign: 'right' }}>{shopName.length}/60</div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button style={backBtn} onClick={() => setStep(1)}>← Back</button>
              <button style={{ ...nextBtn(canAdvance[1]), flex: 1, marginTop: 0 }} onClick={() => canAdvance[1] && setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 3 — COUNTRY */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>Which country are you representing?</h2>
              <button style={macBtn} onClick={() => { setMacField('country'); setMacOpen(true); }}>💬 Ask M.A.C.</button>
            </div>
            {selectedCountry && (
              <div style={{ background: `${green}15`, border: `1px solid ${green}40`, borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: green, fontWeight: 600 }}>
                {selectedCountry.flag} Auto-detected: {selectedCountry.name}
              </div>
            )}
            <CountryPicker countries={MAPOFPI_COUNTRIES} selected={country} onSelect={(code, lang) => { setCountry(code); setLanguage(lang); }} accentColor={green} />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button style={backBtn} onClick={() => setStep(2)}>← Back</button>
              <button style={{ ...nextBtn(canAdvance[2]), flex: 1, marginTop: 0 }} onClick={() => canAdvance[2] && setStep(4)}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — DESCRIPTION */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>Describe your shop</h2>
              <button style={macBtn} onClick={() => { setMacField('description'); setMacOpen(true); }}>💬 Ask M.A.C.</button>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              {loadingHint ? (
                <div style={{ fontSize: '0.78rem', color: green, padding: '0.5rem 0.75rem', background: `${green}10`, borderRadius: '8px' }}>🦋 Aria is writing a suggestion...</div>
              ) : descHint ? (
                <div onClick={() => setDescription(descHint)} style={{ fontSize: '0.78rem', color: green, padding: '0.5rem 0.75rem', background: `${green}10`, border: `1px solid ${green}30`, borderRadius: '8px', cursor: 'pointer' }}>
                  🦋 Aria suggests: <em>&ldquo;{descHint}&rdquo;</em> <span style={{ color: muted }}>tap to use</span>
                </div>
              ) : (
                <button onClick={fetchDescHint} style={{ fontSize: '0.78rem', color: muted, background: 'none', border: `1px solid ${border}`, borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>
                  🦋 Ask Aria to suggest a description
                </button>
              )}
            </div>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: '100px' } as React.CSSProperties} placeholder="Tell people what makes your shop worth visiting..." value={description} onChange={e => handleDescChange(e.target.value)} maxLength={120} autoFocus />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <div style={{ fontSize: '0.68rem', color: urlWarning ? '#f0883e' : muted2 }}>
                {urlWarning ? '⚠️ Links removed automatically — plain words only' : '💡 No links or URLs allowed'}
              </div>
              <div style={{ fontSize: '0.72rem', color: muted }}>{description.length}/120</div>
            </div>
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
              <button style={backBtn} onClick={() => setStep(3)}>← Back</button>
              <button style={{ ...nextBtn(canAdvance[3]), flex: 1, marginTop: 0 }} onClick={() => canAdvance[3] && handleLaunch()}>🚀 Launch Campaign →</button>
            </div>
          </div>
        )}

        {/* STEP 5 — LAUNCH */}
        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{launched ? '✅' : '⚡'}</div>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.5rem' }}>
              {launched ? 'Campaign Live!' : 'Launching your antbots...'}
            </h2>
            {!launched && (
              <div style={{ fontSize: '0.8rem', color: muted, marginBottom: '1rem' }}>
                Building your pod for {selectedCountry?.flag} {selectedCountry?.name} · {language.toUpperCase()}
              </div>
            )}
            <AntbotLaunchGrid activeBot={activeBot} launched={launched} launching={launching} accentColor={green} />
            {ariaMsg && (
              <div style={{ background: `${green}15`, border: `1px solid ${green}40`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#ccc', lineHeight: 1.6, textAlign: 'left' }}>
                {ariaMsg}
              </div>
            )}
            {launched && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a href="/mapofpi/icons/arena" style={{ display: 'block', background: green, color: white, padding: '1rem', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', fontSize: '1rem' }}>
                  🗺️ View Country Champions Arena →
                </a>
                <a href="/arena" style={{ display: 'block', background: 'transparent', color: muted, padding: '0.85rem', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem', border: `1px solid ${border}` }}>
                  View the full Arena →
                </a>
                <a href="/login"
                 style={{
                 display: 'block',
                 background: 'transparent',
                 color: gold,
                 padding: '0.85rem',
                 borderRadius: '12px',
                 fontWeight: 700,
                 textDecoration: 'none',
                 fontSize: '0.9rem',
                 border: `1px solid ${gold}40`,
                 textAlign: 'center',
                  }}
                  > ⚡ Set up your dashboard →
                 </a>
                <button onClick={resetAll} style={{ background: 'none', border: 'none', color: muted2, cursor: 'pointer', fontSize: '0.8rem', padding: '0.5rem' }}>
                  + Create another shop ad
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <MacChatOverlay open={macOpen} onClose={() => setMacOpen(false)} fieldContext={macField} language={language} brandContext="Map of Pi" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

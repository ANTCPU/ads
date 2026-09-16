'use client';

import { useState, useEffect }                    from 'react';
import { createClient }                           from '@supabase/supabase-js';
import { sanitizeDescription, containsUrl }       from '../../lib/sanitize';
import { getAriaLine }                            from '../../lib/ariaLines';
import { tokens, inp, nextBtn, backBtn, macBtn }  from '../../lib/shopAdStyles';
import { buildPod }                               from '../../antbots/index';
import { MAPOFPI_ICONS, MAPOFPI_COUNTRIES }       from '../../clients/mapofpi/assets';
import { PLATFORMS, getShareAction }              from '../../lib/socialShare';
import type { ShareContext }                      from '../../lib/socialShare';
import { recordShare }                            from '../../lib/tracking';
import { SOURCE }                                 from '../../lib/tracking/sources';
import CountryPicker                              from '../../components/CountryPicker';
import AntbotLaunchGrid                           from '../../components/AntbotLaunchGrid';
import MacChatOverlay                             from '../../components/MacChatOverlay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const { green, gold, bg, card, border, white, muted, muted2 } = tokens;

// ─── Share platforms shown on step 5 ─────────────────────────────────────────
// champion-share-surface flag must be ON for this card to render.
// Uses the same PLATFORMS registry as every other share surface.
const SHARE_KEYS = ['whatsapp', 'telegram', 'twitter'] as const;

type Step = 0 | 1 | 2 | 3 | 4 | 5;

export default function CreateShopAdPage() {
  const [step,        setStep]        = useState<Step>(0);
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
  const [insertedId,  setInsertedId]  = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState<string | null>(null);
  const [shareCount,  setShareCount]  = useState(0);
  const [flagShare,   setFlagShare]   = useState(false);
  const [user, setUser] = useState({
    name: '', email: '', brand: 'Map of Pi', trialStatus: 'team', campaign: 'mapofpi',
  });

  // ── Boot — load user + check champion-share-surface flag ─────────────────
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }

    // Check champion-share-surface flag — renders share card on step 5 when ON
    fetch('/api/flags')
      .then(r => r.json())
      .then(d => {
        const flag = (d.flags || []).find((f: { id: string; enabled: boolean }) => f.id === 'champion-share-surface');
        if (flag?.enabled) setFlagShare(true);
      })
      .catch(() => {});
  }, []);

  // ── Auto-detect country from browser locale ───────────────────────────────
  useEffect(() => {
    if (country) return;
    const code  = (navigator.language || 'en-US').split('-')[1]?.toUpperCase() || '';
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Write a 1-sentence shop description (max 100 chars) for a Map of Pi seller. Shop type: ${icon?.label}. Shop name: ${shopName}. Language: ${language}. Output only the description, no quotes, no URLs.`,
          system:  'You are Aria. Output only the requested copy. No preamble. Never include URLs.',
        }),
      });
      const d = await res.json();
      setDescHint(sanitizeDescription(d.reply || d.message || ''));
    } catch {}
    setLoadingHint(false);
  }

  // ── Launch — all 5 Track 1 fixes applied here ─────────────────────────────
  async function handleLaunch() {
    if (!shopType || !shopName || !country || !description.trim()) return;
    setLaunching(true);
    setStep(5);

    const sel       = MAPOFPI_COUNTRIES.find(c => c.code === country);
    const icon      = MAPOFPI_ICONS.find(i => i.slug === shopType);
    const cleanDesc = sanitizeDescription(description);

    const pod = buildPod({
      brand:           'Map of Pi',
      shopName,
      shopType:        icon?.label    || 'General Shop',
      shopEmoji:       icon?.emoji    || '📦',
      country:         sel?.name      || '',
      countryFlag:     sel?.flag      || '',
      language,
      youtubeAnthemId: 'PNoY1ffzciI',
    });

    // ── FIX 1: is_country_champion added to ads insert ────────────────────
    // Was only written to ad_signups — arena couldn't surface champion status
    // from the ad row alone. Now consistent across both tables.
    const { data: inserted } = await supabase.from('ads').insert([{
      email:               user.email || 'ghost@mapofpi.invalid',
      name:                user.name  || shopName,
      brand:               'Map of Pi',
      title:               `${icon?.emoji} ${shopName} — ${sel?.flag} ${sel?.name}`,
      description:         cleanDesc,
      category:            icon?.label || 'General Shop',
      status:              'active',
      trial_status:        'team',
      tier:                'entry',
      image_url:           null,
      campaign:            'mapofpi',
      country:             sel?.name  || null,
      is_country_champion: true,        // ✅ FIX 1
    }]).select('id').single();

    // ── FIX 2: url written after insert using /s/[id] short link ─────────
    // Map of Pi ads had no url — share surfaces and embed API got null.
    // Short link is the canonical shareable URL for every champion ad.
    if (inserted?.id) {
      setInsertedId(inserted.id);
      const shortUrl = `https://antcpu-ads.vercel.app/s/${inserted.id.slice(0, 8)}`;
      await supabase.from('ads')
        .update({ url: shortUrl })
        .eq('id', inserted.id);                // ✅ FIX 2

      try {
        await supabase.from('antbot_pods').insert([{
          ad_id:    inserted.id,
          email:    user.email || 'unknown@mapofpi',
          brand:    'Map of Pi',
          country:  sel?.name  || '',
          language,
          pod_json: JSON.stringify(pod.map(b => ({ id: b.id, channel: b.channel, task: b.task }))),
        }]);
      } catch {}

      // ── FIX 3: Scout score fired after insert ─────────────────────────
      // Was missing — every other ad creation flow fires this.
      // Ensures champion ad enters the ranking system immediately.
      fetch('/api/scout/score', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ad_id: inserted.id }),
      }).catch(() => {});                       // ✅ FIX 3
    }

    // ── Register champion in ad_signups ───────────────────────────────────
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
      country:             sel?.name  || '',
    }], { onConflict: 'email' });

    // ── Champion welcome email ────────────────────────────────────────────
    fetch('/api/send-module', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:        'champion',
        name:        user.name  || shopName,
        email:       user.email || 'ghost@mapofpi.invalid',
        brand:       'Map of Pi',
        trialStatus: 'team',
        shopName,
        country:     sel?.name  || '',
        flag:        sel?.flag  || '',
        adId:        inserted?.id || null,
        category:    icon?.label  || 'General Shop',
      }),
    }).catch(() => {});

    // ── Antbot animation ──────────────────────────────────────────────────
    for (let i = 0; i < 10; i++) {
      setActiveBot(i);
      await new Promise(r => setTimeout(r, 380));
    }

    setAriaMsg(getAriaLine(language));
    setLaunching(false);
    setLaunched(true);

    // ── FIX 4: campaign added to localStorage write ───────────────────────
    // Was missing — dashboard/user flag checks gate on campaign=mapofpi.
    // Without this, the share surface and upload card wouldn't show.
    localStorage.setItem('arena_user', JSON.stringify({
      ...user,
      name:        user.name || shopName,
      brand:       'Map of Pi',
      trialStatus: 'team',
      campaign:    'mapofpi',             // ✅ FIX 4
    }));
  }

  // ── Share action — used by step 5 share card ──────────────────────────────
  // Only active when champion-share-surface flag is ON.
  // Calls recordShare → writes to ad_shares → points flow to champion's ad.
  async function handleShare(platformKey: string) {
    if (!insertedId) return;
    const platform = PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;

    const shortUrl = `https://antcpu-ads.vercel.app/s/${insertedId.slice(0, 8)}`;
    const sel      = MAPOFPI_COUNTRIES.find(c => c.code === country);
    const icon     = MAPOFPI_ICONS.find(i => i.slug === shopType);

    const ctx: ShareContext = {
      brand:       'Map of Pi',
      title:       `${icon?.emoji} ${shopName} — ${sel?.flag} ${sel?.name}`,
      description: sanitizeDescription(description),
      url:         shortUrl,
      profileUrl:  shortUrl,
      category:    icon?.label || 'General Shop',
      country:     sel?.name,
    };

    const { url: intentUrl, text } = getShareAction(platform, ctx);
    if (intentUrl) {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    } else {
      try { await navigator.clipboard.writeText(text); } catch {}
      setShareCopied(platformKey);
      setTimeout(() => setShareCopied(null), 2000);
    }

    // Record to Supabase — points flow to champion's ad immediately
    const newCount = await recordShare(
      { id: insertedId, brand: 'Map of Pi', title: shopName,
        email: user.email || 'ghost@mapofpi.invalid',
        share_count: shareCount, url: shortUrl },
      user.email || 'visitor',
      platform.label,
      SOURCE.MAPOFPI_CHAMPION,
      supabase,
    );
    setShareCount(newCount);
  }

  // ── FIX 5: resetAll goes to step 0 not step 1 ────────────────────────────
  // Skipping step 0 meant a second ad could launch with stale user data.
  function resetAll() {
    setStep(0);                           // ✅ FIX 5
    setShopType(''); setShopName(''); setCountry('');
    setDescription(''); setLaunched(false); setAriaMsg('');
    setActiveBot(0); setDescHint(''); setUrlWarning(false);
    setInsertedId(null); setShareCount(0);
  }

  const selectedIcon    = MAPOFPI_ICONS.find(i => i.slug === shopType);
  const selectedCountry = MAPOFPI_COUNTRIES.find(c => c.code === country);
  const canAdvance      = [
    shopType !== '',
    shopName.trim().length >= 2,
    country !== '',
    description.trim().length >= 10,
  ];
  const STEP_LABELS = [
    'Your details', 'Pick your shop type', 'Name your shop',
    'Choose your country', 'Describe your shop', 'Launching your campaign',
  ];

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
                  background:  shopType === icon.slug ? `${green}22` : card,
                  border:      `2px solid ${shopType === icon.slug ? green : border}`,
                  borderRadius: '14px', padding: '1rem 0.5rem', cursor: 'pointer', textAlign: 'center',
                  transition:  'border-color 0.15s, background 0.15s',
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

                {/* ── SHARE CARD — champion-share-surface flag gates this ── */}
                {/* Renders only when flag is ON. Silent when OFF.           */}
                {/* Every share here calls recordShare → points flow live.   */}
                {flagShare && insertedId && (
                  <div style={{ background: `${green}12`, border: `1px solid ${green}30`, borderRadius: '14px', padding: '1.25rem', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      ↗ Share your shop — earn points
                    </div>
                    <div style={{ fontSize: '0.8rem', color: muted, marginBottom: '0.85rem', lineHeight: 1.5 }}>
                      Every share earns you points toward your next tier. Share now while you're here.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {PLATFORMS.filter(p => SHARE_KEYS.includes(p.key as typeof SHARE_KEYS[number])).map(p => (
                        <button key={p.key} onClick={() => handleShare(p.key)}
                          style={{ background: `${p.color}15`, border: `1px solid ${p.color}30`, borderRadius: '10px', padding: '0.65rem 0.25rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{p.icon}</span>
                          <span style={{ fontSize: '0.62rem', color: '#aaa', fontWeight: 600 }}>{p.label}</span>
                        </button>
                      ))}
                    </div>
                    {shareCount > 0 && (
                      <div style={{ fontSize: '0.68rem', color: green, textAlign: 'center', marginTop: '0.25rem' }}>
                        ↗ {shareCount} share{shareCount !== 1 ? 's' : ''} — ⚡ points on the way
                      </div>
                    )}
                  </div>
                )}

                {/* ── NAV LINKS ── */}
                <a href="/mapofpi/icons/arena" style={{ display: 'block', background: green, color: white, padding: '1rem', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', fontSize: '1rem' }}>
                  🗺️ View Country Champions Arena →
                </a>
                <a href="/arena" style={{ display: 'block', background: 'transparent', color: muted, padding: '0.85rem', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem', border: `1px solid ${border}` }}>
                  View the full Arena →
                </a>
                <a href="/login" style={{ display: 'block', background: 'transparent', color: gold, padding: '0.85rem', borderRadius: '12px', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem', border: `1px solid ${gold}40`, textAlign: 'center' }}>
                  ⚡ Set up your dashboard →
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

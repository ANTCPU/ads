'use client';

// app/mac/page.tsx
// ─── MAC — Map of Pi Shop Builder ────────────────────────────────────────────
// Guides Pi sellers through building their first Arena ad via conversation.
// Detects language + country from localStorage (set by arena on signup/login).
// Checks champion slot on mount — shows banner if open.
// When MAC outputs [AD_DRAFT], renders a draft card with "Create This Ad →".
// If logged in → opens CreateAdDrawer pre-filled.
// If not logged in → redirects to signup with ?ref=mac.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { useRouter }                           from 'next/navigation';
import ArenaNav                                from '../components/ArenaNav';
import ArenaFooter                             from '../components/ArenaFooter';
import CreateAdDrawer                          from '../components/CreateAdDrawer';
import { getStoredLocale }                     from '../lib/locale';

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  role:    'user' | 'mac';
  text:    string;
  tokens?: number;
};

type AdDraft = {
  title:       string;
  description: string;
  category:    string;
  ready:       boolean;
} | null;

type ArenaUser = {
  name:        string;
  email:       string;
  brand:       string;
  trialStatus: string;
  country?:    string;
};

// ── Starter prompts by language ───────────────────────────────────────────────

const STARTERS: Record<string, string[]> = {
  en: ['I have a Map of Pi shop', 'Help me build my first ad', 'What is the Country Champion program?', 'I sell in my country'],
  ar: ['لدي متجر على Map of Pi', 'ساعدني في بناء إعلاني الأول', 'ما هو برنامج بطل الدولة؟'],
  zh: ['我有一个Map of Pi商店', '帮我建立我的第一个广告', '什么是国家冠军计划？'],
  hi: ['मेरे पास Map of Pi की दुकान है', 'मेरा पहला विज्ञापन बनाने में मदद करें', 'देश चैंपियन कार्यक्रम क्या है?'],
  pt: ['Tenho uma loja no Map of Pi', 'Ajude-me a criar meu primeiro anúncio', 'O que é o programa Campeão do País?'],
  fr: ['J\'ai une boutique sur Map of Pi', 'Aidez-moi à créer ma première annonce', 'Qu\'est-ce que le programme Champion du Pays?'],
  id: ['Saya punya toko di Map of Pi', 'Bantu saya membuat iklan pertama', 'Apa itu program Juara Negara?'],
  tr: ['Map of Pi\'de bir dükkanım var', 'İlk reklamımı oluşturmama yardım et', 'Ülke Şampiyonu programı nedir?'],
  ko: ['Map of Pi 상점이 있습니다', '첫 번째 광고 만들기를 도와주세요', '국가 챔피언 프로그램이란?'],
};

function getStarters(lang: string): string[] {
  return STARTERS[lang] || STARTERS.en;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MacPage() {
  const router = useRouter();

  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [sessionId,    setSessionId]    = useState<string | null>(null);
  const [mounted,      setMounted]      = useState(false);
  const [user,         setUser]         = useState<ArenaUser | null>(null);
  const [language,     setLanguage]     = useState('en');
  const [country,      setCountry]      = useState('unknown');
  const [championOpen, setChampionOpen] = useState(false);
  const [adDraft,      setAdDraft]      = useState<AdDraft>(null);
  const [drawerOpen,   setDrawerOpen]   = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // ── Colours ───────────────────────────────────────────────────────────────
  const bg     = '#0a0a0a';
  const card   = '#111';
  const border = '#1a1a1a';
  const green  = '#22c55e';
  const white  = '#fff';
  const muted  = '#555';

  // ── Mount — load user, language, country ──────────────────────────────────
  useEffect(() => {
    setMounted(true);

    const lang = getStoredLocale();
    setLanguage(lang);

    try {
      const stored = localStorage.getItem('arena_user');
      if (stored) {
        const parsed: ArenaUser = JSON.parse(stored);
        setUser(parsed);
        if (parsed.country) setCountry(parsed.country);
      }
    } catch {}

    const storedCountry = localStorage.getItem('arena_country');
    if (storedCountry) {
      setCountry(storedCountry);
    } else {
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(d => {
          if (d.country_name) {
            setCountry(d.country_name);
            localStorage.setItem('arena_country', d.country_name);
          }
        })
        .catch(() => {});
    }
  }, []);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Send ──────────────────────────────────────────────────────────────────
  async function send(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/mac', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:   text.trim(),
          history:   [...messages, userMsg].map(m => ({ role: m.role, text: m.text })),
          language,
          country,
          email:     user?.email || 'visitor',
          sessionId,
        }),
      });

      const data = await res.json();

      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
      if (data.champion_slot_open && !championOpen) setChampionOpen(true);
      if (data.ad_draft?.ready) setAdDraft(data.ad_draft);

      setMessages(prev => [...prev, {
        role:   'mac',
        text:   data.reply || 'Something went wrong — try again.',
        tokens: data.tokens,
      }]);

    } catch {
      setMessages(prev => [...prev, {
        role: 'mac',
        text: 'Connection issue — check your network and try again.',
      }]);
    }

    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function handleCreateAd() {
    if (!user) {
      router.push('/?ref=mac');
      return;
    }
    setDrawerOpen(true);
  }

  if (!mounted) return null;

  const starters = getStarters(language);

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .mac-msg    { animation: fadeUp 0.25s ease both; }
        .mac-start:hover { border-color: #22c55e44 !important; background: #141414 !important; }
        textarea:focus   { outline: none; border-color: #22c55e44 !important; }
        textarea         { resize: none; }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
      `}</style>

      <ArenaNav  />

      {/* ── CHAMPION BANNER ── */}
      {championOpen && (
        <div style={{
          background: '#0a1a0a', borderBottom: `1px solid ${green}30`,
          padding: '0.6rem clamp(16px,5vw,32px)',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          fontSize: '0.82rem', color: green,
        }}>
          <span>🏆</span>
          <span>
            <strong>{country} champion slot is open.</strong>
            {' '}First shop to publish claims it — 10 antbots deploy on launch.
          </span>
        </div>
      )}

      {/* ── CHAT AREA ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px clamp(16px,5vw,32px)', maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ paddingTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: '#0a1a0a', border: `1px solid ${green}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', flexShrink: 0,
              }}>
                🗺️
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Hi, I'm MAC</div>
                <div style={{ fontSize: '0.82rem', color: muted }}>
                  Map of Pi shop builder · I'll get your shop live in the Arena in 2 minutes
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {starters.map(s => (
                <button
                  key={s}
                  className="mac-start"
                  onClick={() => send(s)}
                  style={{
                    background: card, border: `1px solid ${border}`,
                    borderRadius: '10px', padding: '0.75rem 1rem',
                    color: '#aaa', fontSize: '0.88rem', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className="mac-msg"
            style={{
              display: 'flex', gap: '12px', marginBottom: '20px',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            <div style={{
              flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
              background: msg.role === 'mac' ? '#0a1a0a' : '#1a1a1a',
              border: `1px solid ${msg.role === 'mac' ? green + '40' : border}`,
            }}>
              {msg.role === 'mac' ? '🗺️' : '👤'}
            </div>

            <div style={{
              background: msg.role === 'user' ? '#0d1f0d' : card,
              border: `1px solid ${msg.role === 'user' ? green + '30' : border}`,
              borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              padding: '12px 16px', maxWidth: '85%',
              fontSize: '0.9rem', lineHeight: 1.6, color: white,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
              {msg.tokens && msg.tokens > 0 && (
                <div style={{ fontSize: '0.65rem', color: '#333', marginTop: '6px', textAlign: 'right' }}>
                  {msg.tokens} tokens
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="mac-msg" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', background: '#0a1a0a', border: `1px solid ${green}40`,
            }}>
              🗺️
            </div>
            <div style={{
              background: card, border: `1px solid ${border}`,
              borderRadius: '4px 12px 12px 12px', padding: '12px 16px',
              display: 'flex', gap: '4px', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: muted, display: 'inline-block',
                  animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* ── AD DRAFT CARD ── */}
        {adDraft?.ready && (
          <div className="mac-msg" style={{
            background: '#0a1a0a', border: `1px solid ${green}40`,
            borderRadius: '12px', padding: '1.25rem',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              🗺️ Your Ad Draft
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: white, marginBottom: '0.4rem' }}>
              {adDraft.title}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.4rem' }}>
              {adDraft.description}
            </div>
            <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '1rem' }}>
              {adDraft.category} · Entry tier · Free
            </div>
            <button
              onClick={handleCreateAd}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '8px',
                background: green, border: 'none', color: '#000',
                fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
              }}
            >
              {user ? 'Create This Ad →' : 'Sign Up to Publish →'}
            </button>
            {!user && (
              <div style={{ fontSize: '0.72rem', color: muted, textAlign: 'center', marginTop: '0.5rem' }}>
                Free · No credit card · 3-day trial
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <div style={{
        borderTop: `1px solid ${border}`, padding: '16px clamp(16px,5vw,32px)',
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', flexShrink: 0,
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Tell MAC about your shop..."
            rows={1}
            style={{
              flex: 1, background: card, border: `1px solid ${border}`,
              borderRadius: '10px', padding: '12px 16px', color: white,
              fontSize: '0.9rem', fontFamily: 'inherit', lineHeight: 1.5,
              maxHeight: '120px', transition: 'border-color 0.2s', boxSizing: 'border-box',
            }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            style={{
              background: input.trim() && !loading ? green : '#1a1a1a',
              border: `1px solid ${input.trim() && !loading ? green : border}`,
              color: input.trim() && !loading ? '#000' : muted,
              borderRadius: '10px', padding: '12px 20px',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: '0.88rem',
              transition: 'all 0.2s', flexShrink: 0, height: '46px',
            }}
          >
            {loading ? '...' : '↑ Send'}
          </button>
        </div>
        <div style={{ maxWidth: '720px', margin: '8px auto 0', fontSize: '0.68rem', color: '#333', textAlign: 'center' }}>
          MAC · Map of Pi shop builder · Arena powered · Enter to send
        </div>
      </div>

      {/* ── CREATE AD DRAWER ── */}
      {user && (
        <CreateAdDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          user={user}
          onSuccess={() => { setDrawerOpen(false); router.push('/arena'); }}
          initialForm={adDraft ? {
            title:       adDraft.title,
            description: adDraft.description,
            category:    adDraft.category,
            isChampion:  championOpen,
          } : undefined}
        />
      )}

      <ArenaFooter />
    </div>
  );
}

// ============================================================
// components/MacChatOverlay.tsx — M.A.C. Liquid Glass Chat
// Reusable overlay triggered per form field
// Mimics Apple liquid glass: backdrop-filter blur + saturate
// Used by: create-shop-ad, future brand onboarding flows
// ============================================================
'use client';

import { useState, useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  fieldContext: string;   // which field triggered it — drives M.A.C. opening message
  language?: string;      // BCP-47 e.g. 'en', 'hi', 'pt' — M.A.C. responds in this language
  brandContext?: string;  // e.g. 'Map of Pi' — M.A.C. knows the brand
};

// Field-specific opening prompts M.A.C. uses — in English, translated server-side via /api/agent
const FIELD_PROMPTS: Record<string, string> = {
  shopType:    'Help me pick the right shop category for my business on Map of Pi.',
  shopName:    'Help me write a great shop name for my Map of Pi listing.',
  country:     'Help me understand what the Country Champion role means for my country.',
  description: 'Help me write a short, punchy description for my Map of Pi shop ad.',
  launch:      'Tell me what happens when my antbots launch and what to expect.',
  default:     'I need help with my Map of Pi shop ad.',
};

type Message = { role: 'mac' | 'user'; text: string };

export default function MacChatOverlay({
  open, onClose, fieldContext, language = 'en', brandContext = 'Map of Pi',
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [ready,    setReady]    = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset + open greeting when triggered
  useEffect(() => {
    if (!open) { setMessages([]); setInput(''); setReady(false); return; }
    const prompt = FIELD_PROMPTS[fieldContext] || FIELD_PROMPTS.default;
    setReady(false);
    setLoading(true);
    setMessages([]);

    fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        system: `You are M.A.C. — the Map of Pi AI Companion. You are friendly, concise, and helpful. You know everything about Map of Pi (mapofpi.com), Pi Network, and the ANTCPU ADS Country Champion program. Always respond in ${language} language. Keep responses under 3 sentences unless the user asks for more. Brand context: ${brandContext}.`,
      }),
    })
      .then(r => r.json())
      .then(d => {
        setMessages([{ role: 'mac', text: d.reply || d.message || 'Hey! I\'m M.A.C. — ask me anything about your shop ad.' }]);
        setLoading(false);
        setReady(true);
      })
      .catch(() => {
        setMessages([{ role: 'mac', text: 'Hey! I\'m M.A.C. — ask me anything about your shop ad on Map of Pi.' }]);
        setLoading(false);
        setReady(true);
      });
  }, [open, fieldContext, language]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          system: `You are M.A.C. — the Map of Pi AI Companion. Friendly, concise, helpful. Always respond in ${language}. Keep responses under 3 sentences unless asked for more. Brand: ${brandContext}.`,
          history: messages.map(m => ({ role: m.role === 'mac' ? 'assistant' : 'user', content: m.text })),
        }),
      });
      const d = await res.json();
      setMessages(prev => [...prev, { role: 'mac', text: d.reply || d.message || '...' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'mac', text: 'Connection issue — try again.' }]);
    }
    setLoading(false);
  }

  if (!open) return null;

  // ── Liquid glass styles ──────────────────────────────────
  const glass: React.CSSProperties = {
    backdropFilter:         'blur(24px) saturate(180%)',
    WebkitBackdropFilter:   'blur(24px) saturate(180%)',
    background:             'rgba(10, 20, 10, 0.72)',
    border:                 '1px solid rgba(46, 125, 50, 0.35)',
    borderRadius:           '24px',
    boxShadow:              '0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, backdropFilter: 'blur(2px)' }}
      />

      {/* Glass panel */}
      <div style={{
        ...glass,
        position:   'fixed',
        bottom:     '1.5rem',
        left:       '50%',
        transform:  'translateX(-50%)',
        width:      'min(420px, 92vw)',
        maxHeight:  '70vh',
        zIndex:     1200,
        display:    'flex',
        flexDirection: 'column',
        overflow:   'hidden',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(46,125,50,0.2)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #2E7D32, #1B5E20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
            🤖
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', letterSpacing: '0.02em' }}>M.A.C.</div>
            <div style={{ fontSize: '0.65rem', color: '#2E7D32', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Map of Pi AI Companion</div>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: '0.25rem' }}
          >✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth:     '82%',
                padding:      '0.6rem 0.9rem',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background:   m.role === 'user'
                  ? 'rgba(46, 125, 50, 0.5)'
                  : 'rgba(255,255,255,0.07)',
                border:       m.role === 'user'
                  ? '1px solid rgba(46,125,50,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
                fontSize:     '0.85rem',
                color:        '#f0f0f0',
                lineHeight:   1.5,
              }}>
                {m.text}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '0.6rem 0.9rem', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#2E7D32',
                    animation: 'mac-pulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '0.75rem 1.25rem 1rem', borderTop: '1px solid rgba(46,125,50,0.2)', display: 'flex', gap: '0.5rem' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask M.A.C. anything..."
            disabled={!ready || loading}
            style={{
              flex:        1,
              background:  'rgba(255,255,255,0.06)',
              border:      '1px solid rgba(46,125,50,0.3)',
              borderRadius: '12px',
              padding:     '0.6rem 0.9rem',
              color:       '#fff',
              fontSize:    '0.85rem',
              outline:     'none',
              fontFamily:  'system-ui, sans-serif',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!ready || loading || !input.trim()}
            style={{
              background:   ready && input.trim() ? '#2E7D32' : 'rgba(46,125,50,0.2)',
              border:       'none',
              borderRadius: '12px',
              padding:      '0.6rem 0.9rem',
              color:        ready && input.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
              cursor:       ready && input.trim() ? 'pointer' : 'not-allowed',
              fontSize:     '0.9rem',
              transition:   'background 0.2s',
              flexShrink:   0,
            }}
          >↑</button>
        </div>
      </div>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes mac-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

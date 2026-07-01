'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ArenaFooter from '../../components/ArenaFooter';

type Message = {
  role: 'user' | 'aria';
  text: string;
  tokens?: number;
};

const SYSTEM_PROMPT = (arenaData: string) => `You are Aria — the AI agent behind ANTCPU ADS. You are sharp, warm, direct, and deeply knowledgeable about the Arena. You speak like a founder's right hand — no fluff, no filler, just clear insight and real help.

You have live access to the current Arena state:
${arenaData}

You help with:
- Ad strategy and copy
- Understanding the Arena, tiers, and points system
- Map of Pi campaigns and Country Champion program
- Antbot pod capabilities across 10 channels
- Brand positioning and messaging
- Anything related to growing a brand in the Arena

Keep responses concise and actionable. Use line breaks for readability. Never say you're an AI language model — you are Aria, the Arena's intelligence layer.`;

const STARTERS = [
  'How do I climb the leaderboard faster?',
  'Write me a strong ad headline for Map of Pi',
  'What is the Country Champion program?',
  'How do the 10 antbots work?',
  'What tier should I be aiming for?',
  'How do points work in the Arena?',
];

export default function AriaChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [arenaData, setArenaData] = useState('Arena data loading...');
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const bg = '#0a0a0a';
  const card = '#111';
  const border = '#1a1a1a';
  const orange = '#f0883e';
  const white = '#fff';
  const muted = '#555';

  useEffect(() => {
    setMounted(true);
    // Load live arena context
    fetch('/api/agent?token=antcpu-agent-2026')
      .then(r => r.json())
      .then(data => {
        const summary = `Arena: ${data.arena?.total_active_ads} active ads, ${data.arena?.total_users} users. Top ad: "${data.arena?.top_ad?.brand} — ${data.arena?.top_ad?.title}" with ${data.arena?.top_ad?.points} pts. Leaderboard: ${data.leaderboard?.map((a: any) => `#${a.rank} ${a.brand} (${a.points}pts)`).join(', ')}. Pending review: ${data.health?.pending_review}. Today: ${data.today?.note}.`;
        setArenaData(summary);
      })
      .catch(() => setArenaData('Arena data unavailable.'));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .map(m => `${m.role === 'user' ? 'User' : 'Aria'}: ${m.text}`)
        .join('\n');

      const prompt = `${SYSTEM_PROMPT(arenaData)}\n\nConversation so far:\n${history}\n\nAria:`;

      const res = await fetch('/api/ads-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, channel: 'aria-chat' }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'aria',
        text: data.result || 'Something went wrong — try again.',
        tokens: data.tokens,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'aria',
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

  if (!mounted) return null;

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif',
      minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .msg { animation: fadeUp 0.25s ease both; }
        .starter:hover { border-color: #f0883e44 !important; background: #141414 !important; }
        textarea:focus { outline: none; border-color: #f0883e44 !important; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
      `}</style>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 clamp(16px,5vw,32px)', height: '56px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/antbots')}
            style={{ color: muted, background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '13px' }}>
            ← Antbots
          </button>
          <div style={{ width: '1px', height: '16px', background: border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🦋</span>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Aria</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', color: '#3fb950', fontWeight: 600 }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%',
                background: '#3fb950', animation: 'pulse 2s ease infinite',
                display: 'inline-block' }} />
              Live
            </span>
          </div>
        </div>
        <button onClick={() => router.push('/login')}
          style={{ background: orange, color: white, border: 'none',
            borderRadius: '8px', padding: '7px 16px', fontSize: '13px',
            fontWeight: 700, cursor: 'pointer' }}>
          Start Free →
        </button>
      </nav>

      {/* CHAT AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px clamp(16px,5vw,32px)',
        maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '40px',
            animation: 'fadeUp 0.4s ease both' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🦋</div>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '8px' }}>
              Hi, I'm Aria.
            </h2>
            <p style={{ color: muted, fontSize: '0.9rem', lineHeight: 1.7,
              maxWidth: '400px', margin: '0 auto 32px' }}>
              I run the Arena's intelligence layer. Ask me anything about your brand,
              the antbot pod, or how to grow faster.
            </p>

            {/* Starter prompts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '8px', textAlign: 'left' }}>
              {STARTERS.map(s => (
                <button key={s} className="starter" onClick={() => send(s)}
                  style={{ background: card, border: `1px solid ${border}`,
                    borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                    color: '#aaa', fontSize: '0.78rem', lineHeight: 1.5,
                    textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className="msg" style={{
            display: 'flex', gap: '12px', marginBottom: '20px',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          }}>
            {/* Avatar */}
            <div style={{ flexShrink: 0, width: '32px', height: '32px',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '14px',
              background: msg.role === 'aria' ? '#1a1a1a' : orange,
              border: `1px solid ${msg.role === 'aria' ? border : orange}` }}>
              {msg.role === 'aria' ? '🦋' : '⚡'}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'aria' ? card : '#1a1a1a',
              border: `1px solid ${msg.role === 'aria' ? border : '#2a2a2a'}`,
              borderRadius: msg.role === 'aria' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
              padding: '12px 16px',
              fontSize: '0.88rem',
              lineHeight: 1.7,
              color: msg.role === 'aria' ? '#ddd' : white,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
              {msg.tokens && msg.tokens > 0 && (
                <div style={{ fontSize: '0.65rem', color: '#333',
                  marginTop: '6px', textAlign: 'right' }}>
                  {msg.tokens} tokens
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="msg" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', background: '#1a1a1a', border: `1px solid ${border}` }}>
              🦋
            </div>
            <div style={{ background: card, border: `1px solid ${border}`,
              borderRadius: '4px 12px 12px 12px', padding: '12px 16px',
              display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%',
                  background: muted, display: 'inline-block',
                  animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT BAR */}
      <div style={{ borderTop: `1px solid ${border}`, padding: '16px clamp(16px,5vw,32px)',
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
        <div style={{ maxWidth: '720px', margin: '0 auto',
          display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Aria anything about the Arena..."
            rows={1}
            style={{ flex: 1, background: card, border: `1px solid ${border}`,
              borderRadius: '10px', padding: '12px 16px', color: white,
              fontSize: '0.9rem', fontFamily: 'inherit', lineHeight: 1.5,
              maxHeight: '120px', transition: 'border-color 0.2s',
              boxSizing: 'border-box' }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            style={{ background: input.trim() && !loading ? orange : '#1a1a1a',
              border: `1px solid ${input.trim() && !loading ? orange : border}`,
              color: input.trim() && !loading ? white : muted,
              borderRadius: '10px', padding: '12px 20px', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: '0.88rem', transition: 'all 0.2s',
              flexShrink: 0, height: '46px' }}>
            {loading ? '...' : '↑ Send'}
          </button>
        </div>
        <div style={{ maxWidth: '720px', margin: '8px auto 0',
          fontSize: '0.68rem', color: '#333', textAlign: 'center' }}>
          Aria · Powered by Gemini 2.5 Flash · Live Arena context · Enter to send
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';
import { ModuleContext } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const UNLOCK_THRESHOLD = 10;

type Message = {
  role:    'user' | 'aria';
  content: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatModule({ slug, ads, user, isSuper }: ModuleContext) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const brandAds  = ads.filter(a =>
    a.brand?.toLowerCase().includes(slug.toLowerCase())
  );
  const topPoints = Math.max(...brandAds.map(a => a.points || 0), 0);
  const unlocked  = isSuper || topPoints >= UNLOCK_THRESHOLD;

  // — scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // — build arena context for Aria
  function buildContext(): string {
    const topAds = [...brandAds]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5);

    return [
      `You are Aria, the ANTCPU ADS Arena intelligence agent.`,
      `You are helping ${user.name || user.email} from brand "${user.brand || slug}".`,
      `Arena slug: ${slug}`,
      `Active ads: ${brandAds.length}`,
      `Total points: ${topPoints}`,
      isSuper ? `User is super admin — full access.` : '',
      topAds.length > 0
        ? `Top ads:\n${topAds.map(a => `- "${a.title}" — ${a.points || 0} pts, ${a.click_count || 0} clicks, ${a.share_count || 0} shares`).join('\n')}`
        : 'No active ads yet.',
      `\nBe concise, direct, and actionable. Focus on ad performance, sharing strategy, and Arena growth.`,
    ].filter(Boolean).join('\n');
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ads-agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:  `${buildContext()}\n\nUser: ${userMsg}`,
          botId:   'aria',
          channel: `arena-${slug}`,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role:    'aria',
        content: data.result || 'Aria is thinking...',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role:    'aria',
        content: 'Connection issue — try again.',
      }]);
    }
    setLoading(false);
  }

  // ─── Locked view ────────────────────────────────────────────────────────

  if (!unlocked) {
    return (
      <div style={{ textAlign: 'center', padding: '1.25rem 0' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🦋</div>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#aaa', marginBottom: '0.25rem' }}>
          Aria is watching
        </div>
        <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem', lineHeight: 1.6 }}>
          Reach {UNLOCK_THRESHOLD} points to unlock a direct line to Aria.<br />
          You're at {topPoints} pts.
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: '999px', height: '4px', overflow: 'hidden', maxWidth: '160px', margin: '0 auto' }}>
          <div style={{ height: '100%', width: `${Math.min((topPoints / UNLOCK_THRESHOLD) * 100, 100)}%`, background: '#f0883e', borderRadius: '999px', transition: 'width 0.4s' }} />
        </div>
        <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '0.4rem' }}>
          {topPoints}/{UNLOCK_THRESHOLD} pts
        </div>
      </div>
    );
  }

  // ─── User view (unlocked) ────────────────────────────────────────────────

  if (!isSuper) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1rem' }}>🦋</span>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Ask Aria
          </div>
          <span style={{ fontSize: '0.62rem', color: '#22c55e', background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: '999px', padding: '0.1rem 0.4rem' }}>
            ● Unlocked
          </span>
        </div>

        {/* Message thread */}
        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {messages.length === 0 && (
            <div style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic' }}>
              Ask Aria about your ad performance, sharing strategy, or how to climb the Arena.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '0.5rem 0.75rem', borderRadius: '10px',
                background: m.role === 'user' ? '#f0883e' : '#111',
                color: m.role === 'user' ? '#000' : '#aaa',
                fontSize: '0.78rem', lineHeight: 1.5,
                border: m.role === 'aria' ? '1px solid #1a1a1a' : 'none',
              }}>
                {m.role === 'aria' && <span style={{ fontSize: '0.65rem', color: '#f0883e', display: 'block', marginBottom: '0.2rem' }}>🦋 Aria</span>}
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#555' }}>
                🦋 thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask Aria..."
            style={{ flex: 1, background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', outline: 'none' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{ background: input.trim() ? '#f0883e' : '#1a1a1a', border: 'none', color: input.trim() ? '#000' : '#555', borderRadius: '8px', padding: '0.55rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: input.trim() ? 'pointer' : 'not-allowed' }}
          >
            →
          </button>
        </div>
      </div>
    );
  }

  // ─── Super admin view ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>🦋</span>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Aria — Admin
          </div>
          <span style={{ fontSize: '0.62rem', color: '#f0883e', background: '#f0883e15', border: '1px solid #f0883e30', borderRadius: '999px', padding: '0.1rem 0.4rem' }}>
            ⚡ Full Access
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '0.68rem' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Arena context pill */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {[
          { label: `${brandAds.length} ads`,   color: '#aaa' },
          { label: `${topPoints} pts`,          color: '#f0883e' },
          { label: `${slug} arena`,             color: '#555' },
        ].map(p => (
          <span key={p.label} style={{ fontSize: '0.62rem', color: p.color, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '999px', padding: '0.15rem 0.5rem' }}>
            {p.label}
          </span>
        ))}
      </div>

      {/* Message thread */}
      <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0' }}>
        {messages.length === 0 && (
          <div style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic', lineHeight: 1.6 }}>
            Full arena context loaded. Ask Aria anything — ad strategy, ranking analysis, user insights, campaign recommendations.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%', padding: '0.6rem 0.85rem', borderRadius: '10px',
              background: m.role === 'user' ? '#f0883e' : '#0a0a0a',
              color: m.role === 'user' ? '#000' : '#aaa',
              fontSize: '0.78rem', lineHeight: 1.6,
              border: m.role === 'aria' ? '1px solid #1a1a1a' : 'none',
            }}>
              {m.role === 'aria' && (
                <span style={{ fontSize: '0.65rem', color: '#f0883e', display: 'block', marginBottom: '0.25rem', fontWeight: 700 }}>
                  🦋 Aria · {slug} arena
                </span>
              )}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '0.6rem 0.85rem', fontSize: '0.75rem', color: '#555' }}>
              🦋 Aria is thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask Aria anything about this arena..."
          style={{ flex: 1, background: '#0a0a0a', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.78rem', outline: 'none' }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{ background: input.trim() ? '#f0883e' : '#1a1a1a', border: 'none', color: input.trim() ? '#000' : '#555', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: input.trim() ? 'pointer' : 'not-allowed' }}
        >
          →
        </button>
      </div>
    </div>
  );
}

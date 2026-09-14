// app/components/AriaModal.tsx
// ─── Aria ad review modal — extracted from antcpu/page.tsx ───────────────────
'use client';

import React, { useState } from 'react';
import { G, inpStyle, rowBtn } from '../lib/adminTokens';
import { ariaVerdict }         from '../lib/aria';

export type PendingAd = {
  id: string; brand: string; email: string; title: string;
  url: string; description: string; category: string;
  tier: string; created_at: string;
};

function generateAriaResponse(ad: PendingAd, question: string): string {
  const verdict = ariaVerdict(ad);
  const q       = question.toLowerCase().trim();

  if (q.includes('approve') || q.includes('safe') || q.includes('ok'))
    return verdict.autoApprove
      ? `🦋 Yes — I'd approve this. ${verdict.note}`
      : `🦋 I'd hold on this one. ${verdict.note} Review manually before approving.`;

  if (q.includes('reject') || q.includes('problem') || q.includes('issue') || q.includes('wrong'))
    return `🦋 Here's what I flagged: ${verdict.note} ${verdict.autoApprove ? 'That said, the ad looks clean overall.' : 'I recommend rejecting and asking the brand to revise.'}`;

  if (q.includes('url') || q.includes('link') || q.includes('website'))
    return ad.url?.length > 6
      ? `🦋 The URL looks present: ${ad.url} — verify it resolves to the brand's actual site.`
      : `🦋 No valid URL detected. Ask ${ad.brand} to provide their own link.`;

  if (q.includes('brand') || q.includes('who') || q.includes('legit'))
    return `🦋 Brand: **${ad.brand}** · Email: ${ad.email} · Category: ${ad.category} · Tier: ${ad.tier}. ${verdict.note}`;

  if (q.includes('description') || q.includes('copy') || q.includes('text'))
    return ad.description.length < 20
      ? `🦋 Description too short (${ad.description.length} chars). Ask ${ad.brand} to expand it.`
      : `🦋 Description looks adequate at ${ad.description.length} chars. ${verdict.note}`;

  if (q.includes('title') || q.includes('headline'))
    return ad.title.length < 8
      ? `🦋 Title is short (${ad.title.length} chars). A stronger headline would perform better.`
      : `🦋 Title looks good: "${ad.title}"`;

  return `🦋 ${verdict.icon} ${verdict.note} ${verdict.autoApprove ? 'My recommendation: approve.' : 'My recommendation: review manually before approving.'}`;
}

type Props = {
  ad:        PendingAd | null;
  actionId:  string | null;
  onClose:   () => void;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
};

export default function AriaModal({ ad, actionId, onClose, onApprove, onReject }: Props) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [asking,   setAsking]   = useState(false);

  // Reset response when ad changes
  React.useEffect(() => {
    if (ad) setResponse(generateAriaResponse(ad, ''));
    else    setResponse('');
  }, [ad?.id]);

  if (!ad) return null;

  const verdict = ariaVerdict(ad);
  const busy    = actionId === ad.id;

  async function askAria() {
    if (!question.trim()) return;
    setAsking(true);
    await new Promise(r => setTimeout(r, 600));
    setResponse(generateAriaResponse(ad!, question));
    setAsking(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 999, backdropFilter: 'blur(4px)',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '92vw', maxWidth: 560,
        background: G.card, border: `1px solid ${G.orange}40`,
        borderRadius: '16px', padding: '1.5rem',
        zIndex: 1000, maxHeight: '85vh', overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: G.orange, marginBottom: '0.2rem' }}>
              🦋 Aria — Ad Review
            </div>
            <div style={{ fontSize: '0.75rem', color: G.muted }}>
              {ad.brand} · {ad.category} · {ad.tier}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: G.muted, cursor: 'pointer', fontSize: '1.4rem' }}>
            ✕
          </button>
        </div>

        {/* Ad details */}
        <div style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: G.text, marginBottom: '0.35rem' }}>{ad.title}</div>
          <div style={{ fontSize: '0.8rem', color: G.muted, lineHeight: 1.5, marginBottom: '0.5rem' }}>{ad.description}</div>
          <a href={ad.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', color: G.blue, wordBreak: 'break-all', display: 'block', marginBottom: '0.35rem' }}>
            {ad.url || '— no url —'}
          </a>
          <div style={{ fontSize: '0.7rem', color: G.dim }}>
            📧 {ad.email} · {new Date(ad.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Verdict */}
        <div style={{
          background: verdict.autoApprove ? '#0a1a0a' : '#1a0e00',
          border: `1px solid ${verdict.autoApprove ? G.green + '40' : G.orange + '40'}`,
          borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem',
          fontSize: '0.82rem', color: verdict.autoApprove ? G.green : G.orange, lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
            {verdict.icon} Aria Verdict — {verdict.autoApprove ? 'Auto-approve recommended' : 'Manual review required'}
          </div>
          <div style={{ color: G.muted }}>{verdict.note}</div>
        </div>

        {/* Response */}
        {response && (
          <div style={{
            background: '#0a0f1a', border: `1px solid ${G.blue}30`,
            borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem',
            fontSize: '0.82rem', color: '#a0c4ff', lineHeight: 1.6,
          }}>
            {response}
          </div>
        )}

        {/* Ask input */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askAria()}
            placeholder="Ask Aria… e.g. 'Should I approve?' or 'Any URL issues?'"
            style={{ ...inpStyle, marginBottom: 0, flex: 1 }}
          />
          <button onClick={askAria} disabled={asking || !question.trim()}
            style={{
              background: asking ? G.card2 : G.orange, border: 'none',
              borderRadius: '8px', color: asking ? G.muted : '#000',
              fontWeight: 800, fontSize: '0.78rem',
              padding: '0 1rem', cursor: asking ? 'default' : 'pointer',
              flexShrink: 0,
            }}>
            {asking ? '…' : 'Ask →'}
          </button>
        </div>

        {/* Quick questions */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {['Should I approve?', 'Any URL issues?', 'Check the brand', 'Review the title'].map(q => (
            <button key={q} onClick={() => setQuestion(q)}
              style={{
                background: G.card2, border: `1px solid ${G.border2}`,
                borderRadius: '999px', padding: '0.2rem 0.65rem',
                fontSize: '0.68rem', color: G.muted, cursor: 'pointer',
              }}>
              {q}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', borderTop: `1px solid ${G.border}`, paddingTop: '1rem' }}>
          <button onClick={() => onApprove(ad.id)} disabled={busy}
            style={{
              flex: 1, background: busy ? G.card2 : '#0a2a0a',
              border: `1px solid ${busy ? G.border : G.green + '60'}`,
              borderRadius: '8px', color: busy ? G.dim : G.green,
              fontWeight: 800, fontSize: '0.85rem', padding: '0.7rem',
              cursor: busy ? 'default' : 'pointer',
            }}>
            {busy ? '…' : '✅ Approve'}
          </button>
          <button onClick={() => onReject(ad.id)} disabled={busy}
            style={{
              flex: 1, background: busy ? G.card2 : '#2a0a0a',
              border: `1px solid ${busy ? G.border : G.red + '60'}`,
              borderRadius: '8px', color: busy ? G.dim : G.red,
              fontWeight: 800, fontSize: '0.85rem', padding: '0.7rem',
              cursor: busy ? 'default' : 'pointer',
            }}>
            {busy ? '…' : '❌ Reject'}
          </button>
          <button onClick={onClose} style={rowBtn(G.muted)}>Close</button>
        </div>
      </div>
    </>
  );
}

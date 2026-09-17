// app/components/ReactionPicker.tsx
// ─── Reaction Picker — guided single-choice modal ─────────────────────────────
// Replaces the inline reaction buttons in ArenaUniversalClient.
//
// Design intent:
//   — One choice only. Once picked it's locked. No changing.
//   — Each option has a name, emoji, and a one-line explanation
//     so the user understands what they're actually saying.
//   — Feels like a vote, not a like button.
//   — Dismissable by clicking outside or ✕.
//
// Usage:
//   <ReactionPicker
//     ad={ad}
//     currentReaction={reacted[ad.id] || null}
//     onReact={(type) => handleReaction(ad, type)}
//     onClose={() => setReactionTarget(null)}
//     brandColor={color}
//   />
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import React from 'react';

export type ReactionType = 'hot' | 'watching' | 'interesting';

type ReactionDef = {
  type:        ReactionType;
  emoji:       string;
  label:       string;
  explanation: string;
  points:      number;
  color:       string;
};

export const REACTION_DEFS: ReactionDef[] = [
  {
    type:        'hot',
    emoji:       '🔥',
    label:       'Hot',
    explanation: 'This brand is on fire. I want everyone to see this.',
    points:      3,
    color:       '#f0883e',
  },
  {
    type:        'watching',
    emoji:       '👀',
    label:       'Watching',
    explanation: "I'm keeping an eye on this. Something interesting is building here.",
    points:      2,
    color:       '#7928ca',
  },
  {
    type:        'interesting',
    emoji:       '💡',
    label:       'Interesting',
    explanation: "This made me think. I hadn't seen anything like this before.",
    points:      2,
    color:       '#0070f3',
  },
];

type Props = {
  ad:              { id: string; brand: string; title: string };
  currentReaction: ReactionType | null;
  onReact:         (type: ReactionType) => void;
  onClose:         () => void;
  brandColor:      string;
};

export default function ReactionPicker({
  ad, currentReaction, onReact, onClose, brandColor,
}: Props) {
  const locked = !!currentReaction;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex:     1100,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position:  'fixed',
        top:       '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width:     '92vw', maxWidth: 400,
        background: '#111',
        border:    `1px solid ${brandColor}40`,
        borderRadius: '16px',
        padding:   '1.5rem',
        zIndex:    1101,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: '0.2rem' }}>
              How does this land?
            </div>
            <div style={{ fontSize: '0.72rem', color: '#555' }}>
              {locked
                ? 'You already reacted to this ad.'
                : `One reaction per ad — choose what fits ${ad.brand}.`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1, padding: 0, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Ad context */}
        <div style={{
          background:   '#0a0a0a',
          border:       `1px solid ${brandColor}25`,
          borderRadius: '8px',
          padding:      '0.6rem 0.85rem',
          marginBottom: '1.25rem',
          fontSize:     '0.78rem',
          color:        '#888',
        }}>
          <span style={{ color: brandColor, fontWeight: 700 }}>{ad.brand}</span>
          {' · '}
          <span>{ad.title.length > 50 ? ad.title.slice(0, 50) + '…' : ad.title}</span>
        </div>

        {/* Reaction options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {REACTION_DEFS.map(r => {
            const isChosen  = currentReaction === r.type;
            const isDimmed  = locked && !isChosen;

            return (
              <button
                key={r.type}
                onClick={() => !locked && onReact(r.type)}
                disabled={locked}
                style={{
                  background:   isChosen ? `${r.color}18` : '#0a0a0a',
                  border:       `1px solid ${isChosen ? r.color : isDimmed ? '#1a1a1a' : '#222'}`,
                  borderRadius: '12px',
                  padding:      '0.85rem 1rem',
                  cursor:       locked ? 'default' : 'pointer',
                  opacity:      isDimmed ? 0.35 : 1,
                  transition:   'all 0.15s',
                  textAlign:    'left',
                  width:        '100%',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.85rem',
                }}
              >
                {/* Emoji */}
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{r.emoji}</span>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight:  700,
                    fontSize:    '0.85rem',
                    color:       isChosen ? r.color : '#fff',
                    marginBottom: '0.2rem',
                    display:     'flex',
                    alignItems:  'center',
                    gap:         '0.4rem',
                  }}>
                    {r.label}
                    {isChosen && (
                      <span style={{
                        background:   `${r.color}25`,
                        border:       `1px solid ${r.color}50`,
                        borderRadius: '999px',
                        padding:      '0.05rem 0.45rem',
                        fontSize:     '0.6rem',
                        color:        r.color,
                        fontWeight:   700,
                      }}>
                        your reaction
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#666', lineHeight: 1.4 }}>
                    {r.explanation}
                  </div>
                </div>

                {/* Points badge — only show when not locked */}
                {!locked && (
                  <div style={{
                    flexShrink:   0,
                    background:   `${r.color}15`,
                    border:       `1px solid ${r.color}30`,
                    borderRadius: '999px',
                    padding:      '0.2rem 0.5rem',
                    fontSize:     '0.65rem',
                    color:        r.color,
                    fontWeight:   700,
                    whiteSpace:   'nowrap',
                  }}>
                    +{r.points} pts
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: '1rem', fontSize: '0.65rem', color: '#333', textAlign: 'center' }}>
          {locked
            ? 'Reactions are permanent — they carry real weight in the Arena.'
            : 'Your reaction gives points to this brand and shapes the Arena rankings.'}
        </div>
      </div>
    </>
  );
}

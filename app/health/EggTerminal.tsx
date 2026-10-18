// app/health/EggTerminal.tsx
// ─── Easter Egg Terminal ──────────────────────────────────────────────────────
// Client component. Renders a blinking cursor at the bottom of /health.
// Listens for input. Checks against egg registry.
// Silence on unknown. Silence on null slot. Reveal on active egg.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState, useRef, useEffect } from 'react'
import { resolveEgg } from '@/lib/eggs'

export default function EggTerminal() {
  const [input, setInput]     = useState('')
  const [found, setFound]     = useState(false)
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus terminal on click anywhere in the terminal area
    inputRef.current?.focus()
  }, [])

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const result = resolveEgg(input)
    if (result && result.active) {
      setFound(true)
      setMessage(result.message)
    }
    // null or undefined — silence, just clear
    setInput('')
  }

  return (
    <div
      style={{ marginTop: '4rem', borderTop: '1px solid #1a1a1a', paddingTop: '2rem', cursor: 'text' }}
      onClick={() => inputRef.current?.focus()}
    >
      {!found ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#333', fontFamily: 'monospace', fontSize: '0.9rem' }}>{'>'}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#333',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              width: '200px',
              caretColor: '#333',
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      ) : (
        <div style={{
          background: '#0f1a0f',
          border: '1px solid #1a3a1a',
          borderRadius: '6px',
          padding: '1.5rem',
          maxWidth: '480px',
        }}>
          <pre style={{
            color: '#4ade80',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap',
            margin: 0,
            lineHeight: 1.7,
          }}>
            {message}
          </pre>
        </div>
      )}
    </div>
  )
}

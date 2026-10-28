// ============================================================
// app/internship/submit/SubmitClient.tsx
// Track-aware guided submission — Dev 3-step / Marketing 3-step
// Auto-populates from localStorage session + github_handle
// URL verification via /api/internship/submit/check
// Gate labels match API GATE_LABELS exactly
// ============================================================

'use client';

import { useState, useEffect } from 'react';

const accent  = '#2563eb';
const success = '#22c55e';
const muted   = '#6b7280';

// Gate labels match API GATE_LABELS — title field in submissions row
const SUBMIT_GATES: Record<number, { id: string; label: string; desc: string; needsUrl: boolean }[]> = {
  1: [
    { id: 'd5', label: '💬 Joined the Community Session', desc: 'Link to your intro post or community message', needsUrl: false },
    { id: 'd7', label: '📝 Submitted Week 1 Reflection',  desc: 'What did you learn? What will you build next?', needsUrl: false },
  ],
  2: [
    { id: 'd12', label: '🔧 Improved Based on Feedback',  desc: 'Dev: repo/PR URL · Mkt: campaign or post URL', needsUrl: true  },
    { id: 'd13', label: '📤 Submitted Week 2 Progress',   desc: 'Notes on the work you reviewed this week',     needsUrl: false },
    { id: 'd14', label: '📝 Submitted Week 2 Reflection', desc: 'What shipped? What would you do differently?', needsUrl: false },
  ],
  3: [
    { id: 'd19', label: '📦 Submitted Joint Deliverable', desc: 'URL to your cross-track joint submission',     needsUrl: true  },
    { id: 'd21', label: '📝 Submitted Week 3 Reflection', desc: 'Team dynamics, what you built together',       needsUrl: false },
  ],
  4: [
    { id: 'd23', label: '🏗️ Built Week 4 Feature',       desc: 'Dev: final PR · Mkt: final campaign URL',      needsUrl: true  },
    { id: 'd24', label: '🏆 Final Submission & Showcase', desc: 'Your showcase URL — make it count',            needsUrl: true  },
  ],
};

type CheckResult = { ok: boolean; reachable: boolean; status: number; error?: string };

function StatusPill({ result }: { result: CheckResult | null }) {
  if (!result) return null;
  if (result.ok) return (
    <span style={{ fontSize: '0.72rem', color: success, fontWeight: 700 }}>✅ Link verified</span>
  );
  return (
    <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>
      ⚠️ {result.error ?? `Not reachable (${result.status})`}
    </span>
  );
}

export default function SubmitClient({ currentWeek }: { currentWeek: number }) {

  // ── Session ──────────────────────────────────────────────
  const [internId,     setInternId]     = useState('');
  const [handle,       setHandle]       = useState('');
  const [track,        setTrack]        = useState<'dev' | 'marketing'>('dev');
  const [githubHandle, setGithubHandle] = useState('');
  const [brandSlug,    setBrandSlug]    = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('antcpu_session') || '{}');
      if (s.intern_id) setInternId(s.intern_id);
      if (s.handle)    setHandle(s.handle);
      if (s.track)     setTrack(s.track === 'marketing' ? 'marketing' : 'dev');
    } catch {}

    const h = (() => { try { return JSON.parse(localStorage.getItem('antcpu_session') || '{}').handle; } catch { return ''; } })();
    if (h) {
      fetch(`/api/office/${h}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            if (d.github_handle) {
              setGithubHandle(d.github_handle.replace('https://github.com/', '').replace(/\/$/, ''));
            }
            if (d.brand_slug) setBrandSlug(d.brand_slug);
          }
          setSessionReady(true);
        })
        .catch(() => setSessionReady(true));
    } else {
      setSessionReady(true);
    }
  }, []);

  // ── Gate selection ───────────────────────────────────────
  const week       = Math.min(Math.max(currentWeek, 1), 4);
  const gates      = SUBMIT_GATES[week] ?? [];
  const [gateId,   setGateId]    = useState(gates[0]?.id ?? '');
  const activeGate = gates.find(g => g.id === gateId) ?? gates[0];

  // ── Form fields ──────────────────────────────────────────
  const [url,         setUrl]         = useState('');
  const [description, setDescription] = useState('');
  const [checking,    setChecking]    = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState('');

  // ── Auto-populate URL when gate or track changes ─────────
  useEffect(() => {
    setUrl('');
    setCheckResult(null);
    if (!activeGate?.needsUrl) return;

    if (track === 'dev' && githubHandle) {
      if (gateId === 'd12' || gateId === 'd23') {
        setUrl(`https://github.com/${githubHandle}/ads/blob/main/PLAN.md`);
      } else if (gateId === 'd24') {
        setUrl(`https://github.com/${githubHandle}/ads/pulls`);
      }
    } else if (track === 'marketing' && brandSlug) {
      setUrl(`https://antcpu-ads.vercel.app/arena/${brandSlug}`);
    }
  }, [gateId, track, githubHandle, brandSlug]);

  // ── URL check ────────────────────────────────────────────
  async function checkUrl() {
    if (!url.trim()) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(`/api/internship/submit/check?url=${encodeURIComponent(url.trim())}`);
      const d   = await res.json();
      setCheckResult(d);
    } catch {
      setCheckResult({ ok: false, reachable: false, status: 0, error: 'Check failed' });
    } finally {
      setChecking(false);
    }
  }

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit() {
    if (!internId && !handle)            { setError('Session not found — please log in again.'); return; }
    if (!gateId)                         { setError('Select a gate to submit for.'); return; }
    if (!description.trim())             { setError('Add a description before submitting.'); return; }
    if (activeGate?.needsUrl && !url.trim()) { setError('A URL is required for this gate.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/internship/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intern_id:   internId || undefined,
          handle:      handle   || undefined,
          gate_id:     gateId,
          type:        track === 'dev' ? 'tool' : 'campaign',
          url:         url.trim() || null,
          title:       activeGate?.label ?? gateId,
          description: description.trim(),
          track,
          week,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Submit failed');
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── No session ───────────────────────────────────────────
  if (sessionReady && !internId && !handle) {
    return (
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16,
        padding: '2.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔒</div>
        <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Sign in to submit</h2>
        <p style={{ color: muted, fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Your session was not found. Log in to access your submission form.
        </p>
        <a href="/login" style={{ background: accent, color: '#fff', padding: '0.65rem 1.5rem',
          borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>
          Log In →
        </a>
      </div>
    );
  }

  // ── Done state ───────────────────────────────────────────
  if (done) {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16,
        padding: '2.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem', color: '#166534' }}>
          Submission received
        </h2>
        <p style={{ color: '#15803d', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Gate <strong>{gateId}</strong> logged. Progress updated.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={handle ? `/office/${handle}` : '/office'}
            style={{ background: accent, color: '#fff', padding: '0.65rem 1.25rem',
              borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>
            View My Office →
          </a>
          <button onClick={() => { setDone(false); setDescription(''); setUrl(''); setCheckResult(null); }}
            style={{ background: 'transparent', border: '1px solid #22c55e', color: '#166534',
              padding: '0.65rem 1.25rem', borderRadius: 8, fontWeight: 700,
              fontSize: '0.875rem', cursor: 'pointer' }}>
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  const isDev = track === 'dev';

  return (
    <div style={{ marginTop: '1.5rem' }}>

      {/* Track badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        background: isDev ? '#0d1117' : '#1a0a2e', border: '1px solid #1e3a5f',
        borderRadius: 999, padding: '0.3rem 0.85rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.8rem' }}>{isDev ? '💻' : '📣'}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: accent }}>
          {isDev ? 'Developer' : 'Marketer'} · Week {week}
        </span>
      </div>

      {/* Gate selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700,
          color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          Select Gate
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {gates.map(g => (
            <button key={g.id} onClick={() => setGateId(g.id)} style={{
              textAlign: 'left', padding: '0.75rem 1rem',
              background: gateId === g.id ? `${accent}12` : '#f9fafb',
              border: `1.5px solid ${gateId === g.id ? accent : '#e5e7eb'}`,
              borderRadius: 10, cursor: 'pointer',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem',
                color: gateId === g.id ? accent : '#111' }}>
                {g.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: muted, marginTop: 2 }}>{g.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dev 3-step guide */}
      {isDev && activeGate?.needsUrl && (
        <div style={{ background: '#0d1117', border: '1px solid #1e3a5f',
          borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: accent,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            💻 Dev Checklist
          </div>
          {[
            { step: '1', label: 'Fork / clone the repo',          href: 'https://github.com/ANTCPU/ads',        cta: 'Open Repo →'  },
            { step: '2', label: 'Create your PR',                  href: 'https://github.com/ANTCPU/ads/pulls', cta: 'Open PRs →'   },
            { step: '3', label: 'Confirm your PLAN.md link below', href: null,                                   cta: null           },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: accent,
                color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.step}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#e6edf3', flex: 1 }}>{s.label}</span>
              {s.href && (
                <a href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: accent, fontWeight: 700,
                    textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {s.cta}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Marketing 3-step guide */}
      {!isDev && activeGate?.needsUrl && (
        <div style={{ background: '#1a0a2e', border: '1px solid #1e3a5f',
          borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a855f7',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            📣 Marketer Checklist
          </div>
          {[
            { step: '1', label: 'Your Arena ad is live',                   href: brandSlug ? `https://antcpu-ads.vercel.app/arena/${brandSlug}` : null, cta: 'View Ad →' },
            { step: '2', label: 'Paste your campaign / content URL below', href: null, cta: null },
            { step: '3', label: 'Describe your results below',             href: null, cta: null },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#a855f7',
                color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.step}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#e6edf3', flex: 1 }}>{s.label}</span>
              {s.href && (
                <a href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: 700,
                    textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {s.cta}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* URL field */}
      {activeGate?.needsUrl && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700,
            color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
            {isDev ? 'PLAN.md / PR URL' : 'Campaign / Content URL'}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setCheckResult(null); }}
              placeholder={isDev
                ? `https://github.com/${githubHandle || 'your-handle'}/ads/blob/main/PLAN.md`
                : 'https://...'}
              style={{ flex: 1, padding: '0.65rem 0.875rem', borderRadius: 8,
                border: `1.5px solid ${checkResult ? (checkResult.ok ? success : '#ef4444') : '#e5e7eb'}`,
                fontSize: '0.875rem', outline: 'none', fontFamily: 'monospace' }}
            />
            <button onClick={checkUrl} disabled={checking || !url.trim()}
              style={{ padding: '0.65rem 1rem', background: accent, color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem',
                cursor: checking || !url.trim() ? 'not-allowed' : 'pointer',
                opacity: checking || !url.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
              {checking ? '…' : 'Check →'}
            </button>
          </div>
          <div style={{ marginTop: '0.35rem', minHeight: '1.2rem' }}>
            <StatusPill result={checkResult} />
          </div>
        </div>
      )}

      {/* Description */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700,
          color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
          {isDev ? 'What did you build?' : 'What did you run / publish?'}
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value.slice(0, 1000))}
          rows={4}
          placeholder={isDev
            ? 'Describe what you built, what it does, and any challenges you hit...'
            : 'Describe your campaign, what you published, and the results you saw...'}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 8,
            border: '1.5px solid #e5e7eb', fontSize: '0.875rem',
            resize: 'vertical', outline: 'none', fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.6, boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: '0.7rem', color: muted, marginTop: '0.25rem', textAlign: 'right' }}>
          {description.length} / 1000
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '0.65rem 1rem', fontSize: '0.825rem', color: '#dc2626', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !sessionReady}
        style={{ width: '100%', padding: '0.9rem', background: accent, color: '#fff',
          border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '1rem',
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.7 : 1 }}>
        {submitting ? 'Submitting…' : `Submit ${activeGate?.label ?? 'Gate'} →`}
      </button>

      <p style={{ fontSize: '0.72rem', color: muted, textAlign: 'center', marginTop: '0.75rem' }}>
        Submitting as <strong>{handle || internId}</strong> · {isDev ? '💻 Dev' : '📣 Marketing'}
      </p>
    </div>
  );
}

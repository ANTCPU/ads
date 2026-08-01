'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ─── Design tokens (matches user dashboard) ───────────────────
const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#555';
const white  = '#fff';
const accent = '#2563eb';

// ─── Image slot definitions ───────────────────────────────────
// status: 'live' | 'soon'
// All validation limits enforced client + server
const SLOTS = [
  {
    id:          'brand-og',
    label:       'Brand Share Image',
    status:      'live' as const,
    description: 'Shown when your Arena page is shared on Twitter, Facebook, or any link preview.',
    required:    '1200 × 630px · JPG or PNG · max 500KB',
    w: 1200, h: 630, maxKB: 500,
    formats:     ['jpg', 'jpeg', 'png'],
    destination: 'ad_profiles.og_image_url',
  },
  {
    id:          'ad-image',
    label:       'Ad Image',
    status:      'soon' as const,
    description: 'Image shown on your ad card in the Arena feed.',
    required:    '1200 × 628px · JPG or PNG · max 400KB',
    w: 1200, h: 628, maxKB: 400,
    formats:     ['jpg', 'jpeg', 'png'],
    destination: 'ads.image_url',
    soonMsg:     'Ad images are coming soon. Your ad runs with text only for now — that\'s how all ads start.',
  },
  {
    id:          'profile-pic',
    label:       'Profile Picture',
    status:      'soon' as const,
    description: 'Your brand avatar shown on your public profile page.',
    required:    '400 × 400px · JPG or PNG · max 200KB',
    w: 400, h: 400, maxKB: 200,
    formats:     ['jpg', 'jpeg', 'png'],
    destination: 'ad_profiles.avatar_url',
    soonMsg:     'Profile pictures are coming soon.',
  },
];

type Phase = 'idle' | 'preview' | 'uploading' | 'done' | 'error';

export default function BrandImagesPage() {
  const router = useRouter();
  const [email, setEmail]         = useState('');
  const [currentOg, setCurrentOg] = useState<string | null>(null);
  const [phase, setPhase]         = useState<Phase>('idle');
  const [errMsg, setErrMsg]       = useState('');
  const [preview, setPreview]     = useState<string | null>(null);
  const [file, setFile]           = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      setEmail(u.email);
      // Load existing OG image
      fetch(`/api/profile/og?email=${encodeURIComponent(u.email)}`)
        .then(r => r.json())
        .then(d => { if (d.og_image_url) setCurrentOg(d.og_image_url); })
        .catch(() => {});
    } catch { router.push('/'); }
  }, []);

  // ── Client-side validation ──────────────────────────────────
  async function validate(f: File): Promise<string | null> {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    const slot = SLOTS[0]; // brand-og is the only live slot
    if (!slot.formats.includes(ext)) return `Upload JPG or PNG only.`;
    if (f.size > slot.maxKB * 1024) return `Too large — max ${slot.maxKB}KB. Yours is ${Math.round(f.size / 1024)}KB.`;
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { w, h } = slot;
        if (Math.abs(img.width - w) > 10 || Math.abs(img.height - h) > 10) {
          resolve(`Wrong size — need ${w}×${h}px. Yours is ${img.width}×${img.height}px.`);
        } else resolve(null);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve('Could not read image.'); };
      img.src = url;
    });
  }

  async function handleFile(f: File) {
    setPhase('idle'); setErrMsg('');
    const err = await validate(f);
    if (err) { setErrMsg(err); setPhase('error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      setPreview(e.target?.result as string);
      setFile(f);
      setPhase('preview');
    };
    reader.readAsDataURL(f);
  }

  async function handleUpload() {
    if (!file || !email) return;
    setPhase('uploading');
    const form = new FormData();
    form.append('file', file);
    form.append('email', email);
    try {
      const res  = await fetch('/api/upload/brand-og', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      setCurrentOg(json.url);
      setPreview(null);
      setFile(null);
      setPhase('done');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Upload failed');
      setPhase('error');
    }
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', color: white, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Header */}
        <button onClick={() => router.push('/dashboard/user')}
          style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.78rem', padding: 0, marginBottom: '1.5rem' }}>
          ← Dashboard
        </button>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>Brand Images</h1>
        <p style={{ color: muted, fontSize: '0.85rem', marginBottom: '2rem' }}>
          Control how your brand looks when shared across the web.
        </p>

        {/* ── LIVE: Brand OG Image ─────────────────────────── */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>Brand Share Image</div>
              <div style={{ fontSize: '0.78rem', color: muted }}>Shown when your Arena page is shared on social media.</div>
            </div>
            <span style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              ● LIVE
            </span>
          </div>

          {/* Current image or placeholder */}
          <div style={{ background: '#0a0a0a', border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', marginBottom: '1rem', aspectRatio: '1200/630', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(phase === 'preview' && preview) ? (
              <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : currentOg ? (
              <img src={currentOg} alt="Current share image" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ textAlign: 'center', color: muted }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🖼</div>
                <div style={{ fontSize: '0.78rem' }}>No image yet</div>
                <div style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>1200 × 630px</div>
              </div>
            )}
          </div>

          {/* Spec */}
          <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '1rem' }}>
            Required: <strong style={{ color: '#888' }}>1200 × 630px</strong> · JPG or PNG · max 500KB
          </div>

          {/* Error */}
          {phase === 'error' && (
            <div style={{ background: '#1a0a0a', border: '1px solid #ef444440', borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: '#ef4444', marginBottom: '0.75rem' }}>
              ⚠️ {errMsg}
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div style={{ background: '#0a1a0a', border: '1px solid #22c55e40', borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: '#22c55e', marginBottom: '0.75rem' }}>
              ✅ Uploaded — live on your next share. <a href={`/arena/${email.split('@')[0]}`} style={{ color: '#22c55e', marginLeft: '0.5rem' }}>Test it →</a>
            </div>
          )}

          {/* Drop zone — only when not uploading or done */}
          {phase !== 'uploading' && (
            <div
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => { if (phase !== 'preview') inputRef.current?.click(); }}
              style={{
                border: `2px dashed ${phase === 'error' ? '#ef4444' : '#333'}`,
                borderRadius: 10, padding: '1.25rem', textAlign: 'center',
                cursor: phase === 'preview' ? 'default' : 'pointer',
                marginBottom: phase === 'preview' ? '0.75rem' : 0,
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#888', fontWeight: 600 }}>
                {phase === 'preview' ? 'Drop a different file to replace' : 'Drop file here or click to browse'}
              </div>
              <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}

          {/* Preview actions */}
          {phase === 'preview' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleUpload}
                style={{ flex: 1, background: accent, color: white, border: 'none', borderRadius: 8, padding: '0.7rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                Upload →
              </button>
              <button onClick={() => { setPhase('idle'); setPreview(null); setFile(null); }}
                style={{ background: '#1a1a1a', color: '#888', border: `1px solid ${border}`, borderRadius: 8, padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          )}

          {/* Uploading */}
          {phase === 'uploading' && (
            <div style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', color: muted }}>
              Uploading…
            </div>
          )}
        </div>

        {/* ── COMING SOON slots ────────────────────────────── */}
        {SLOTS.filter(s => s.status === 'soon').map(slot => (
          <div key={slot.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '1.5rem', marginBottom: '1rem', opacity: 0.7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{slot.label}</div>
                <div style={{ fontSize: '0.78rem', color: muted }}>{slot.description}</div>
              </div>
              <span style={{ background: '#1a1a1a', color: muted, border: `1px solid ${border}`, borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                🔜 SOON
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#444', background: '#0a0a0a', border: `1px solid ${border}`, borderRadius: 8, padding: '0.75rem' }}>
              {slot.soonMsg}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#333', marginTop: '0.5rem' }}>
              When live: {slot.required}
            </div>
          </div>
        ))}

        {/* Footer note */}
        <p style={{ fontSize: '0.72rem', color: '#333', textAlign: 'center', marginTop: '1.5rem' }}>
          Images are served from a global CDN. Changes are live within seconds.
        </p>
      </div>
    </div>
  );
}

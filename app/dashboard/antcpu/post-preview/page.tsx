'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const PLATFORM_CTA: Record<string, string> = {
  'Facebook':   'https://antcpu.com',
  'Instagram':  'antcpu.com',
  'Twitter/X':  'antcpu.com',
  'LinkedIn':   'https://antcpu.com',
};

const MOCK_COPY = `We build.

Your vision. Our craft.

antcpu.com`;
const MOCK_HASHTAGS = `#ANTCPU #WeBuild #HumansAndAI`;

const s: Record<string, React.CSSProperties> = {
  page:       { background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', padding: '1.5rem', maxWidth: '480px', margin: '0 auto' },
  back:       { fontSize: '0.75rem', color: '#444', cursor: 'pointer', marginBottom: '1.5rem', display: 'inline-block' },
  logo:       { fontWeight: 800, fontSize: '1rem', color: '#f0883e', marginBottom: '0.2rem' },
  sub:        { fontSize: '0.7rem', color: '#333', letterSpacing: '0.1em', marginBottom: '2rem' },
  card:       { background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem' },
  cardHead:   { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid #1a1a1a' },
  avatar:     { width: '38px', height: '38px', borderRadius: '50%', background: '#f0883e22', border: '1px solid #f0883e44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 },
  handle:     { fontWeight: 700, fontSize: '0.85rem' },
  platform:   { fontSize: '0.7rem', color: '#444' },
  imgBox:     { width: '100%', aspectRatio: '1/1', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const, borderBottom: '1px solid #1a1a1a' },
  imgMock:    { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  imgLabel:   { fontSize: '2rem', fontWeight: 900, color: '#f0883e', letterSpacing: '0.1em' },
  imgSub:     { fontSize: '0.75rem', color: '#333' },
  genBtn:     { position: 'absolute' as const, bottom: '1rem', right: '1rem', background: '#f0883e', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' },
  genBtnLoad: { position: 'absolute' as const, bottom: '1rem', right: '1rem', background: '#333', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', color: '#888', fontSize: '0.75rem', fontWeight: 700, cursor: 'not-allowed' },
  cardBody:   { padding: '1rem 1.25rem' },
  copy:       { fontSize: '0.88rem', lineHeight: 1.7, color: '#ddd', whiteSpace: 'pre-wrap' as const, marginBottom: '0.75rem' },
  hashtags:   { fontSize: '0.8rem', color: '#f0883e99', marginBottom: '1rem' },
  actions:    { display: 'flex', gap: '0.5rem', borderTop: '1px solid #1a1a1a', padding: '0.75rem 1.25rem' },
  actionBtn:  { flex: 1, background: 'none', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.5rem', color: '#555', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 },
  actionPrim: { flex: 1, background: '#f0883e', border: 'none', borderRadius: '8px', padding: '0.5rem', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 },
  channels:   { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const, marginBottom: '1.5rem' },
  chip:       { background: '#111', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '0.35rem 0.85rem', fontSize: '0.72rem', color: '#555', cursor: 'pointer' },
  chipActive: { background: '#f0883e22', border: '1px solid #f0883e44', borderRadius: '20px', padding: '0.35rem 0.85rem', fontSize: '0.72rem', color: '#f0883e', cursor: 'pointer' },
  section:    { fontSize: '0.7rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' },
  statusBar:  { background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  overlayBar: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '0.75rem 1.25rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  overlayBtn: { background: '#f0883e22', border: '1px solid #f0883e44', borderRadius: '8px', padding: '0.4rem 0.9rem', color: '#f0883e', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 },
  overlayOn:  { background: '#f0883e', border: 'none', borderRadius: '8px', padding: '0.4rem 0.9rem', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 },
  statusDot:  { width: '7px', height: '7px', borderRadius: '50%', background: '#d29922', display: 'inline-block', marginRight: '0.5rem' },
  errorMsg:   { fontSize: '0.75rem', color: '#ff7b72', padding: '0.5rem 1.25rem' },
};

const CHANNELS = ['Facebook', 'Instagram', 'Twitter/X', 'LinkedIn'];

export default function PostPreview() {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState('Facebook');
  const [image, setImage]       = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('antcpu-post.png');
  const [loading, setLoading]   = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [overlaySize, setOverlaySize] = useState(16);
  const [overlayColor, setOverlayColor] = useState('#ffffff');
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [error, setError]       = useState<string | null>(null);

  async function generateImage() {
    setLoading(true);
    setError(null);
    setImage(null);
    try {
      const res = await fetch('/api/ads-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Dark minimalist abstract tech background. Deep black with subtle orange ember glow. Clean geometric lines. No text, no logos, no words, no letters. Square format. Premium brand aesthetic. Cinematic lighting.`,
          filename: `antcpu-${activeChannel.toLowerCase().replace('/','-')}-${Date.now()}.png`,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setImage(data.image);
      setFilename(data.filename);
    } catch (e) {
      setError('Image generation failed.');
    } finally {
      setLoading(false);
    }
  }

  function downloadImage() {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image;
    a.download = filename;
    a.click();
  }

  return (
    <div style={s.page}>
      <div style={s.back} onClick={() => router.push('/dashboard/antcpu')}>← Back</div>
      <div style={s.logo}>⚡ ANTCPU ADS</div>
      <div style={s.sub}>POST PREVIEW</div>

      <div style={s.section}>Channel</div>
      <div style={s.channels}>
        {CHANNELS.map(c => (
          <div key={c} style={activeChannel === c ? s.chipActive : s.chip} onClick={() => setActiveChannel(c)}>
            {c}
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.avatar}>⚡</div>
          <div>
            <div style={s.handle}>ANTCPU</div>
            <div style={s.platform}>{activeChannel} · @antcpucom</div>
          </div>
        </div>

        <div style={s.imgBox}>
          {image ? (
            <img src={image} alt="generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={s.imgMock}>
              <div style={s.imgLabel}>ANTCPU</div>
              <div style={s.imgSub}>{loading ? 'generating...' : 'image preview — tap generate'}</div>
            </div>
          )}
          <button
            style={loading ? s.genBtnLoad : s.genBtn}
            onClick={generateImage}
            disabled={loading}
          >
            {loading ? '⏳ generating...' : '✦ Generate Image'}
          </button>
        </div>

        {error && <div style={s.errorMsg}>⚠ {error}</div>}

        <div style={s.cardBody}>
          <div style={s.copy}>{MOCK_COPY}{'\n'}{PLATFORM_CTA[activeChannel]}</div>
          <div style={s.hashtags}>{MOCK_HASHTAGS}</div>
        </div>

        <div style={s.actions}>
          <button style={s.actionBtn}>✎ Edit</button>
          <button
            style={image ? s.actionBtn : { ...s.actionBtn, opacity: 0.3, cursor: 'not-allowed' }}
            onClick={downloadImage}
            disabled={!image}
          >↓ Download</button>
          <button style={s.actionPrim} onClick={() => {
            const postText = MOCK_COPY + '\n\n' + MOCK_HASHTAGS + '\n' + PLATFORM_CTA[activeChannel];
            navigator.clipboard.writeText(postText).then(() => alert('✅ Post copy copied to clipboard — ready to paste'));
            if (image) downloadImage();
          }}>↑ Export</button>
        </div>
      </div>

      {image && (
        <div style={s.overlayBar}>
          <span style={{ fontSize: '0.75rem', color: '#555' }}>Text overlay on image</span>
          <button
            style={showOverlay ? s.overlayOn : s.overlayBtn}
            onClick={() => setShowOverlay(o => !o)}
          >{showOverlay ? '✦ Overlay ON' : '+ Add Overlay'}</button>
        </div>
      )}

      {image && showOverlay && (
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ fontSize: '0.7rem', color: '#444', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>OVERLAY PREVIEW</div>
          {/* Overlay controls */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            <input
              style={{ flex: 1, background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
              placeholder={PLATFORM_CTA[activeChannel]}
              value={overlayText}
              onChange={e => setOverlayText(e.target.value)}
            />
            <input type="color" value={overlayColor} onChange={e => setOverlayColor(e.target.value)}
              style={{ width: '36px', height: '36px', border: 'none', borderRadius: '6px', background: 'none', cursor: 'pointer', padding: 0 }} />
            <select value={overlaySize} onChange={e => setOverlaySize(Number(e.target.value))}
              style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.4rem', color: '#fff', fontSize: '0.8rem' }}>
              {[12,14,16,20,24,32,40].map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>

          {/* Live preview */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden' }}>
            <img src={image} alt="base" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {(overlayText || PLATFORM_CTA[activeChannel]) && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '2rem 1.25rem 1.25rem' }}>
                <div style={{ fontSize: `${overlaySize}px`, color: overlayColor, fontWeight: 700, letterSpacing: '0.03em' }}>
                  {overlayText || PLATFORM_CTA[activeChannel]}
                </div>
              </div>
            )}
          </div>
          <button
            style={{ width: '100%', marginTop: '0.75rem', background: '#f0883e', border: 'none', borderRadius: '8px', padding: '0.6rem', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            onClick={downloadImage}
          >↓ Download with Overlay</button>
        </div>
      )}

      <div style={s.statusBar}>
        <div><span style={s.statusDot} />{image ? 'Image ready · draft' : 'Draft · not published'}</div>
        <div>ANTCPU · {activeChannel}</div>
      </div>
    </div>
  );
}

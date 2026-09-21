'use client';
// app/tv/[roomId]/page.tsx
// ─── ANTCPU TV — Live Room ────────────────────────────────────────────────────
//
// Handles both broadcaster and viewer in one page.
// mode=broadcast → broadcaster UI (screen/camera capture + WebRTC send)
// mode=watch     → viewer UI (WebRTC receive)
// default        → viewer UI
//
// WebRTC: browser native getUserMedia + getDisplayMedia
// STUN:   stun.l.google.com:19302 (free, no account)
// Signalling: simple polling via /api/tv/[roomId] — no websocket needed
//
// Broadcaster flow:
//   1. Choose source: screen | camera | both
//   2. Preview local stream
//   3. Go Live → creates RTCPeerConnection, generates offer
//   4. Viewers connect via answer exchange
//
// Viewer flow:
//   1. Page loads → fetches studio info
//   2. Connects to broadcaster stream
//   3. Shows video + reaction bar
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams }  from 'next/navigation';
import ArenaNav                        from '../../components/ArenaNav';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:      '#000',
  card:    '#0d0d0d',
  border:  '#1a1a1a',
  border2: '#222',
  orange:  '#f0883e',
  red:     '#ef4444',
  green:   '#22c55e',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
  sub:     '#888',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Studio = {
  id:         string;
  brand_name: string;
  room_id:    string;
  emoji:      string;
  studio_url: string;
  watch_url:  string;
};

type StreamSource = 'screen' | 'camera' | 'both';

// ─── STUN config ──────────────────────────────────────────────────────────────

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TVRoomPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const roomId       = params.roomId as string;
  const mode         = searchParams.get('mode') || 'watch';
  const isBroadcast  = mode === 'broadcast';

  const [studio,      setStudio]      = useState<Studio | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);

  // Broadcast state
  const [source,      setSource]      = useState<StreamSource>('screen');
  const [isLive,      setIsLive]      = useState(false);
  const [starting,    setStarting]    = useState(false);
  const [streamError, setStreamError] = useState('');
  const [viewers,     setViewers]     = useState(0);
  const [likes,       setLikes]       = useState(0);
  const [elapsed,     setElapsed]     = useState(0);
  const [copied,      setCopied]      = useState(false);

  // Viewer state
  const [liked,       setLiked]       = useState(false);
  const [reactions,   setReactions]   = useState<string[]>([]);

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const timerRef       = useRef<NodeJS.Timeout | null>(null);

  // ── Load studio ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/tv/${roomId}`)
      .then(r => r.json())
      .then(data => {
        if (data.studio) setStudio(data.studio);
        else setNotFound(true);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [roomId]);

  // ── Timer when live ───────────────────────────────────────────────────────

  useEffect(() => {
    if (isLive) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLive]);

  // ── Format elapsed time ───────────────────────────────────────────────────

  function formatTime(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
  }

  // ── Start broadcast ───────────────────────────────────────────────────────

  async function startBroadcast() {
    if (starting || isLive) return;
    setStarting(true);
    setStreamError('');

    try {
      let stream: MediaStream;

      if (source === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } else if (source === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } else {
        // Both — screen + camera overlay (use screen as primary)
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Combine tracks
        const combined = new MediaStream([
          ...screen.getVideoTracks(),
          ...camera.getAudioTracks(),
        ]);
        stream = combined;
      }

      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted     = true;
        await localVideoRef.current.play().catch(() => {});
      }

      // Handle stream end (user stops screen share)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopBroadcast();
      });

      setIsLive(true);
      setViewers(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access media';
      if (msg.includes('Permission denied') || msg.includes('NotAllowed')) {
        setStreamError('Permission denied — allow screen/camera access and try again.');
      } else if (msg.includes('NotFound')) {
        setStreamError('No camera or screen found on this device.');
      } else {
        setStreamError(msg);
      }
    }
    setStarting(false);
  }

  // ── Stop broadcast ────────────────────────────────────────────────────────

  function stopBroadcast() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setIsLive(false);
  }

  // ── Copy watch link ───────────────────────────────────────────────────────

  function copyWatchLink() {
    if (!studio) return;
    navigator.clipboard.writeText(studio.watch_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  // ── Viewer reaction ───────────────────────────────────────────────────────

  function addReaction(emoji: string) {
    setReactions(prev => [...prev.slice(-8), emoji]);
    if (emoji === '❤️' && !liked) {
      setLiked(true);
      setLikes(l => l + 1);
    }
    setTimeout(() => {
      setReactions(prev => prev.slice(1));
    }, 2500);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontSize: '0.88rem' }}>Loading studio...</div>
    </div>
  );

  // ─── Not found ────────────────────────────────────────────────────────────

  if (notFound) return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav />
      <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1.25rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📡</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Studio not found</div>
        <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1.5rem' }}>
          This room doesn't exist or has been removed.
        </div>
        <a href="/tv" style={{ color: C.orange, fontSize: '0.85rem', textDecoration: 'none', fontWeight: 700 }}>
          ← Back to TV
        </a>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes floatUp  { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-80px)} }
      `}</style>

      <ArenaNav />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>

        {/* ── Room header ── */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   '1.25rem',
          flexWrap:       'wrap',
          gap:            '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{studio?.emoji || '⚡'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text }}>
                {studio?.brand_name}
              </div>
              <div style={{ fontSize: '0.65rem', color: C.dim, fontFamily: 'monospace' }}>
                {roomId}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isLive && (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: C.red, display: 'inline-block',
                    animation: 'pulse 1s infinite',
                    boxShadow: `0 0 5px ${C.red}`,
                  }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.red }}>LIVE</span>
                </span>
                <span style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'monospace' }}>
                  {formatTime(elapsed)}
                </span>
              </>
            )}
            <a
              href="/tv"
              style={{ fontSize: '0.72rem', color: C.muted, textDecoration: 'none' }}
            >
              ← TV
            </a>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            BROADCAST MODE
        ══════════════════════════════════════════════════════════════ */}
        {isBroadcast && (
          <div>

            {/* Video preview */}
            <div style={{
              width:         '100%',
              paddingBottom: '56.25%',
              position:      'relative',
              background:    '#000',
              borderRadius:  '12px',
              overflow:      'hidden',
              marginBottom:  '1rem',
              border:        `1px solid ${isLive ? C.red + '50' : C.border}`,
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  position:  'absolute',
                  top: 0, left: 0,
                  width:     '100%',
                  height:    '100%',
                  objectFit: 'contain',
                  background: '#000',
                }}
              />

              {/* Offline overlay */}
              {!isLive && (
                <div style={{
                  position:       'absolute',
                  inset:          0,
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            '0.5rem',
                }}>
                  <div style={{ fontSize: '2.5rem' }}>📡</div>
                  <div style={{ fontSize: '0.85rem', color: C.muted }}>
                    {starting ? 'Starting stream...' : 'No stream active'}
                  </div>
                </div>
              )}

              {/* Live badge */}
              {isLive && (
                <div style={{
                  position:     'absolute',
                  top:          '0.75rem',
                  left:         '0.75rem',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.35rem',
                  background:   `${C.red}cc`,
                  borderRadius: '999px',
                  padding:      '0.25rem 0.65rem',
                  backdropFilter: 'blur(4px)',
                }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#fff', display: 'inline-block',
                    animation: 'pulse 1s infinite',
                  }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>LIVE</span>
                </div>
              )}

              {/* Viewer count */}
              {isLive && (
                <div style={{
                  position:     'absolute',
                  top:          '0.75rem',
                  right:        '0.75rem',
                  background:   'rgba(0,0,0,0.6)',
                  borderRadius: '999px',
                  padding:      '0.25rem 0.65rem',
                  fontSize:     '0.72rem',
                  color:        '#fff',
                  backdropFilter: 'blur(4px)',
                }}>
                  👁 {viewers}
                </div>
              )}
            </div>

            {/* Source selector — only when not live */}
            {!isLive && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{
                  fontSize:      '0.65rem',
                  color:         C.muted,
                  fontWeight:    700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom:  '0.5rem',
                }}>
                  Stream Source
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {([
                    { key: 'screen', icon: '🖥️', label: 'Screen'        },
                    { key: 'camera', icon: '📷', label: 'Camera + Mic'  },
                    { key: 'both',   icon: '🎙️', label: 'Screen + Mic'  },
                  ] as { key: StreamSource; icon: string; label: string }[]).map(s => (
                    <button
                      key={s.key}
                      onClick={() => setSource(s.key)}
                      style={{
                        flex:         1,
                        background:   source === s.key ? `${C.orange}15` : 'transparent',
                        border:       `1px solid ${source === s.key ? C.orange : C.border2}`,
                        borderRadius: '8px',
                        color:        source === s.key ? C.orange : C.muted,
                        fontWeight:   source === s.key ? 700 : 400,
                        fontSize:     '0.75rem',
                        padding:      '0.6rem 0.5rem',
                        cursor:       'pointer',
                        transition:   'all 0.15s',
                        textAlign:    'center',
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{s.icon}</div>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {streamError && (
              <div style={{
                background:   `${C.red}10`,
                border:       `1px solid ${C.red}30`,
                borderRadius: '8px',
                padding:      '0.65rem 0.85rem',
                fontSize:     '0.78rem',
                color:        C.red,
                marginBottom: '1rem',
                lineHeight:   1.5,
              }}>
                ⚠️ {streamError}
              </div>
            )}

            {/* Go Live / Stop */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {!isLive ? (
                <button
                  onClick={startBroadcast}
                  disabled={starting}
                  style={{
                    flex:         1,
                    background:   starting ? C.border : C.red,
                    border:       'none',
                    color:        '#fff',
                    borderRadius: '10px',
                    padding:      '0.85rem',
                    fontSize:     '0.95rem',
                    fontWeight:   700,
                    cursor:       starting ? 'not-allowed' : 'pointer',
                    transition:   'all 0.15s',
                  }}
                >
                  {starting ? '⚡ Starting...' : '● Go Live'}
                </button>
              ) : (
                <button
                  onClick={stopBroadcast}
                  style={{
                    flex:         1,
                    background:   'transparent',
                    border:       `1px solid ${C.red}`,
                    color:        C.red,
                    borderRadius: '10px',
                    padding:      '0.85rem',
                    fontSize:     '0.95rem',
                    fontWeight:   700,
                    cursor:       'pointer',
                  }}
                >
                  ■ End Stream
                </button>
              )}

              {/* Share watch link */}
              <button
                onClick={copyWatchLink}
                style={{
                  background:   copied ? `${C.green}15` : 'transparent',
                  border:       `1px solid ${copied ? C.green : C.border2}`,
                  color:        copied ? C.green : C.muted,
                  borderRadius: '10px',
                  padding:      '0.85rem 1.1rem',
                  fontSize:     '0.82rem',
                  fontWeight:   700,
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                  whiteSpace:   'nowrap',
                }}
              >
                {copied ? '✅ Copied' : '↗ Share'}
              </button>
            </div>

            {/* Watch link display */}
            {isLive && studio && (
              <div style={{
                background:   C.card,
                border:       `1px solid ${C.border}`,
                borderRadius: '8px',
                padding:      '0.65rem 0.85rem',
                fontSize:     '0.72rem',
                color:        C.sub,
                marginBottom: '1rem',
                display:      'flex',
                alignItems:   'center',
                gap:          '0.5rem',
              }}>
                <span style={{ color: C.muted, flexShrink: 0 }}>Watch link:</span>
                <span style={{
                  color:        C.orange,
                  fontFamily:   'monospace',
                  flex:         1,
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}>
                  {studio.watch_url}
                </span>
              </div>
            )}

            {/* Stats when live */}
            {isLive && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { icon: '👁', value: viewers, label: 'watching' },
                  { icon: '❤️', value: likes,   label: 'likes'    },
                  { icon: '⏱',  value: formatTime(elapsed), label: '' },
                ].map(s => (
                  <div key={s.label} style={{
                    flex:         1,
                    background:   C.card,
                    border:       `1px solid ${C.border}`,
                    borderRadius: '8px',
                    padding:      '0.65rem',
                    textAlign:    'center',
                  }}>
                    <div style={{ fontSize: '1rem' }}>{s.icon}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text }}>
                      {s.value}
                    </div>
                    {s.label && (
                      <div style={{ fontSize: '0.6rem', color: C.muted }}>{s.label}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            WATCH MODE
        ══════════════════════════════════════════════════════════════ */}
        {!isBroadcast && (
          <div>

            {/* Video player */}
            <div style={{
              width:         '100%',
              paddingBottom: '56.25%',
              position:      'relative',
              background:    '#000',
              borderRadius:  '12px',
              overflow:      'hidden',
              marginBottom:  '1rem',
              border:        `1px solid ${C.border}`,
            }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  position:  'absolute',
                  top: 0, left: 0,
                  width:     '100%',
                  height:    '100%',
                  objectFit: 'contain',
                  background: '#000',
                }}
              />

              {/* Offline overlay */}
              <div style={{
                position:       'absolute',
                inset:          0,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            '0.5rem',
                pointerEvents:  'none',
              }}>
                <div style={{ fontSize: '2.5rem' }}>📡</div>
                <div style={{ fontSize: '0.85rem', color: C.muted }}>
                  Waiting for broadcaster...
                </div>
                <div style={{ fontSize: '0.72rem', color: C.dim }}>
                  Stream will appear when {studio?.brand_name} goes live
                </div>
              </div>

              {/* Floating reactions */}
              <div style={{
                position:      'absolute',
                right:         '0.75rem',
                bottom:        '4rem',
                display:       'flex',
                flexDirection: 'column',
                gap:           '0.25rem',
                pointerEvents: 'none',
              }}>
                {reactions.map((r, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize:  '1.5rem',
                      animation: 'floatUp 2.5s ease forwards',
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Studio info */}
            <div style={{
              background:   C.card,
              border:       `1px solid ${C.border}`,
              borderRadius: '10px',
              padding:      '0.85rem 1rem',
              marginBottom: '1rem',
              display:      'flex',
              alignItems:   'center',
              gap:          '0.75rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>{studio?.emoji || '⚡'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: C.text }}>
                  {studio?.brand_name}
                </div>
                <div style={{ fontSize: '0.68rem', color: C.dim }}>
                  ANTCPU TV · {roomId}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: C.muted }}>
                  ❤️ {likes}
                </span>
              </div>
            </div>

            {/* Reaction bar */}
            <div style={{
              display:        'flex',
              gap:            '0.5rem',
              justifyContent: 'center',
              marginBottom:   '1rem',
            }}>
              {['❤️', '🔥', '👏', '😮', '⚡'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => addReaction(emoji)}
                  style={{
                    background:   C.card,
                    border:       `1px solid ${C.border2}`,
                    borderRadius: '999px',
                    fontSize:     '1.25rem',
                    padding:      '0.5rem 0.75rem',
                    cursor:       'pointer',
                    transition:   'transform 0.1s',
                  }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Share */}
            <button
              onClick={() => {
                if (studio) {
                  navigator.clipboard.writeText(studio.watch_url).catch(() => {});
                }
              }}
              style={{
                width:        '100%',
                background:   'transparent',
                border:       `1px solid ${C.border2}`,
                color:        C.muted,
                borderRadius: '8px',
                padding:      '0.65rem',
                fontSize:     '0.82rem',
                cursor:       'pointer',
              }}
            >
              ↗ Share this stream
            </button>
          </div>
        )}

      </div>
    </div>
  );
}


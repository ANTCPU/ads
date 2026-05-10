'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAPOFPI_KB } from '../../../clients/mapofpi/kb';

const POSTS: Record<string, { label: string; copy: string; hashtags: string; cta: string }[]> = {
  Facebook: [
    {
      label: 'Stats Post',
      copy: `Map of Pi is the world's most used crypto global marketplace on your smartphone.\n\n✓ 2.1M+ registered users\n✓ 148,000 sellers\n✓ 173,000+ completed transactions\n\nFree to use. International. No bank account required.\n\nSearch, Buy & Sell on Map of Pi today → mapofpi.com`,
      hashtags: '#mapofpi #pinetwork #picommerce #picommunity',
      cta: 'https://mapofpi.com',
    },
    {
      label: 'Trust Post',
      copy: `Real people. Real reviews. Real Pi commerce.\n\nMap of Pi connects buyers and sellers across the globe — with trust scores, KYC verification, and EscrowPi for safe transactions.\n\nThe Pi economy is here. → mapofpi.com`,
      hashtags: '#mapofpi #pinetwork #escrowpi #trustpilot',
      cta: 'https://mapofpi.com',
    },
    {
      label: 'v2 Teaser',
      copy: `Version 1.8 is live. Version 2.0 is coming.\n\nOnline shopping. Next-level utility. The evolution the Pi community has been patiently awaiting.\n\nVolunteer built. Pioneer powered. Ecosystem proven.\n\nmapofpi.com`,
      hashtags: '#mapofpi #pinetwork #buildinpublic #v2',
      cta: 'https://mapofpi.com',
    },
  ],
  'Twitter/X': [
    {
      label: 'Stats Post',
      copy: `Map of Pi — the world's most used crypto marketplace on your phone.\n\n2.1M+ users · 148K sellers · 173K+ transactions\n\nFree. International. No bank needed.\n\nmapofpi.com`,
      hashtags: '#mapofpi #pinetwork #picommerce',
      cta: 'mapofpi.com',
    },
    {
      label: 'Trust Post',
      copy: `Pi commerce is real.\n\nMap of Pi has KYC verification, trust scores, buyer reviews, and EscrowPi for safe trades.\n\nReal people. Real Pi. Real commerce.\n\nmapofpi.com`,
      hashtags: '#mapofpi #pinetwork #escrowpi',
      cta: 'mapofpi.com',
    },
    {
      label: 'v2 Teaser',
      copy: `v1.8 is live.\nv2.0 is coming — online shopping for the Pi ecosystem.\n\nVolunteer built. Pioneer powered.\n\nmapofpi.com`,
      hashtags: '#mapofpi #buildinpublic #pinetwork',
      cta: 'mapofpi.com',
    },
  ],
  Instagram: [
    {
      label: 'Stats Post',
      copy: `The world's most used crypto marketplace is in your pocket. 🗺️\n\n✓ 2.1M+ registered users\n✓ 148,000 sellers\n✓ 173,000+ completed transactions\n\nFree to use. No bank account required.\n\nLink in bio → mapofpi.com`,
      hashtags: '#mapofpi #pinetwork #picommerce #crypto #marketplace #picommunity',
      cta: 'mapofpi.com',
    },
    {
      label: 'Trust Post',
      copy: `Trust built into every transaction. 🔒\n\nKYC verified sellers. Buyer reviews. EscrowPi protection.\n\nMap of Pi — Real people. Real reviews. Real Pi commerce.\n\nmapofpi.com`,
      hashtags: '#mapofpi #pinetwork #escrowpi #trustworthy #crypto',
      cta: 'mapofpi.com',
    },
    {
      label: 'v2 Teaser',
      copy: `Something big is coming to Map of Pi. 👀\n\nv2.0 — online shopping for the entire Pi ecosystem.\n\nVolunteer built. Pioneer powered. Ecosystem proven.\n\nStay tuned → mapofpi.com`,
      hashtags: '#mapofpi #pinetwork #comingsoon #buildinpublic #v2',
      cta: 'mapofpi.com',
    },
  ],
  LinkedIn: [
    {
      label: 'Stats Post',
      copy: `Map of Pi has become the world's most used crypto global marketplace — and it's built entirely by volunteers.\n\n• 2.1M+ registered users\n• 148,000 active sellers\n• 173,000+ completed buyer-seller transactions\n\nFree to use. KYC verified. No bank account required. Available internationally.\n\nThis is what community-driven commerce looks like. → mapofpi.com`,
      hashtags: '#mapofpi #pinetwork #blockchain #ecommerce #crypto #community',
      cta: 'https://mapofpi.com',
    },
    {
      label: 'Trust Post',
      copy: `Trust is the foundation of commerce — and Map of Pi has built it into every layer.\n\nKYC verification via Pi Network blockchain. Buyer reviews and trust scores. EscrowPi for neutral, automated transaction protection.\n\nReal people. Real reviews. Real Pi commerce.\n\nmapofpi.com`,
      hashtags: '#mapofpi #pinetwork #fintech #blockchain #escrow',
      cta: 'https://mapofpi.com',
    },
    {
      label: 'v2 Teaser',
      copy: `Map of Pi v1.8 is live and being used globally.\n\nv2.0 is next — online shopping, expanded utility, and the next chapter of Pi commerce.\n\nVolunteer built. Pioneer powered. Ecosystem proven.\n\nWatch this space. → mapofpi.com`,
      hashtags: '#mapofpi #pinetwork #buildinpublic #web3 #ecommerce',
      cta: 'https://mapofpi.com',
    },
  ],
  'Pi Network': [
    {
      label: 'Stats Post',
      copy: `Map of Pi — the #1 Pi commerce platform.\n\n2.1M+ Pioneers registered\n148,000 sellers accepting Pi\n173,000+ completed transactions\n\nFind sellers near you. Leave reviews. Spend your Pi.\n\nmapofpi.com`,
      hashtags: '#mapofpi #pinetwork #spendpi #picommerce',
      cta: 'mapofpi.com',
    },
    {
      label: 'Trust Post',
      copy: `Your Pi has value. Map of Pi makes it spendable.\n\nKYC verified. EscrowPi protected. Globally available.\n\nReal Pi commerce — right now.\n\nmapofpi.com`,
      hashtags: '#mapofpi #pinetwork #picommerce #escrowpi',
      cta: 'mapofpi.com',
    },
    {
      label: 'v2 Teaser',
      copy: `Map of Pi v2.0 is coming — online shopping for the entire Pi ecosystem.\n\nThe Pi economy is evolving. Be part of it.\n\nmapofpi.com`,
      hashtags: '#mapofpi #pinetwork #v2 #picommerce',
      cta: 'mapofpi.com',
    },
  ],
  Discord: [
    {
      label: 'Stats Post',
      copy: `📢 Map of Pi update:\n\n2.1M+ registered users\n148,000 sellers\n173,000+ completed transactions\n\nThe Pi marketplace keeps growing. Share it with your community → mapofpi.com`,
      hashtags: '#mapofpi #pinetwork',
      cta: 'mapofpi.com',
    },
    {
      label: 'Trust Post',
      copy: `🔒 Safe Pi trading with EscrowPi\n\nMap of Pi has built-in escrow, KYC verification, and buyer reviews so every transaction is protected.\n\nTry it → mapofpi.com`,
      hashtags: '#mapofpi #escrowpi',
      cta: 'mapofpi.com',
    },
    {
      label: 'v2 Teaser',
      copy: `👀 v2.0 is coming to Map of Pi — online shopping for the Pi ecosystem.\n\nv1.8 is live now. Get familiar before the upgrade drops.\n\nmapofpi.com`,
      hashtags: '#mapofpi #v2 #pinetwork',
      cta: 'mapofpi.com',
    },
  ],
};

const CHANNELS = Object.keys(POSTS);

export default function MapOfPiPostBuilder() {
  const router = useRouter();
  const [channel, setChannel] = useState('Facebook');
  const [postIdx, setPostIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [quickCopied, setQuickCopied] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const post = POSTS[channel][postIdx];
  const fullText = `${post.copy}\n\n${post.hashtags}`;

  function copy() {
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function generateImage() {
    setImgLoading(true);
    setImgError(null);
    setImage(null);
    try {
      const res = await fetch('/api/ads-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: MAPOFPI_KB.brand.imagePrompt,
          filename: `mapofpi-${channel.toLowerCase().replace('/','-')}-${Date.now()}.png`,
        }),
      });
      const data = await res.json();
      if (data.error) { setImgError(data.error); return; }
      setImage(data.image);
    } catch { setImgError('Image generation failed.'); }
    finally { setImgLoading(false); }
  }

  function downloadImage() {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image;
    a.download = `mapofpi-${channel.toLowerCase()}-post.png`;
    a.click();
  }

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#f0883e' }}>⚡ ANTCPU ADS</div>
          <div style={{ fontSize: '0.7rem', color: '#444', letterSpacing: '0.1em' }}>MAP OF PI · POST BUILDER</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#555', background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.4rem 1rem' }}>
            🗺️ Map of Pi · v1.8 · 2.1M+ users
          </div>
          <button onClick={() => setQuickMode(q => !q)} style={{ background: quickMode ? '#2E7D32' : 'none', border: '1px solid #2E7D3244', color: quickMode ? '#fff' : '#2E7D32', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>⚡ Quick Copy</button>
          <button onClick={() => router.push('/dashboard/mapofpi')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.82rem' }}>← Agent Dashboard</button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

        {/* Quick Copy Mode */}
        {quickMode && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#D4AF37', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>⚡ Quick Copy — tap any post to copy instantly</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {CHANNELS.map(ch =>
                POSTS[ch].map((p, i) => {
                  const key = ch + '-' + i;
                  const isCopied = quickCopied === key;
                  return (
                    <div key={key} onClick={() => {
                      navigator.clipboard.writeText(p.copy + '\n\n' + p.hashtags).then(() => {
                        setQuickCopied(key);
                        setTimeout(() => setQuickCopied(null), 2000);
                      });
                    }} style={{ background: isCopied ? '#3fb95015' : '#111', border: isCopied ? '1px solid #3fb95044' : '1px solid #1a1a1a', borderRadius: '12px', padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.65rem', color: '#D4AF37', background: '#D4AF3715', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 700 }}>{ch}</span>
                          <span style={{ fontSize: '0.65rem', color: '#555' }}>{p.label}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.5, whiteSpace: 'pre-wrap' as const }}>{p.copy.slice(0, 80)}...</div>
                      </div>
                      <div style={{ flexShrink: 0, fontSize: '0.78rem', fontWeight: 700, color: isCopied ? '#3fb950' : '#333' }}>
                        {isCopied ? '✓ Copied' : '📋'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Channel selector */}
        <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Channel</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {CHANNELS.map(c => (
            <button key={c} onClick={() => { setChannel(c); setPostIdx(0); setImage(null); }}
              style={{ background: channel === c ? '#2E7D32' : '#111', border: channel === c ? 'none' : '1px solid #1a1a1a', color: channel === c ? '#fff' : '#555', borderRadius: '20px', padding: '0.35rem 1rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>

        {/* Post selector */}
        <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Post Template</div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {POSTS[channel].map((p, i) => (
            <button key={i} onClick={() => { setPostIdx(i); setImage(null); }}
              style={{ background: postIdx === i ? '#2E7D3222' : '#111', border: postIdx === i ? '1px solid #2E7D3244' : '1px solid #1a1a1a', color: postIdx === i ? '#2E7D32' : '#555', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Side by side — preview + image */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Post card */}
          <div style={{ flex: 1, minWidth: '280px', background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #D4AF3744', flexShrink: 0 }}><img src={MAPOFPI_KB.brand.logoUrl} alt='Map of Pi' style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Map of Pi</div>
                <div style={{ fontSize: '0.7rem', color: '#444' }}>{channel} · @mapofpi</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#D4AF37', background: '#D4AF3715', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.2rem 0.6rem' }}>🗺️ FEATURED</div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: '#ddd', whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>{post.copy}</div>
              <div style={{ fontSize: '0.8rem', color: '#D4AF3799', marginBottom: '1.25rem' }}>{post.hashtags}</div>
              <a href={post.cta} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#2E7D32', textDecoration: 'none', fontWeight: 600 }}>{post.cta} →</a>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.25rem', borderTop: '1px solid #1a1a1a' }}>
              <button onClick={copy} style={{ flex: 1, background: copied ? '#3fb95022' : 'none', border: copied ? '1px solid #3fb95044' : '1px solid #1a1a1a', color: copied ? '#3fb950' : '#555', borderRadius: '8px', padding: '0.5rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                {copied ? '✓ Copied' : '📋 Copy Text'}
              </button>
              <button onClick={generateImage} disabled={imgLoading} style={{ flex: 1, background: imgLoading ? '#333' : '#2E7D3222', border: '1px solid #D4AF3744', color: imgLoading ? '#888' : '#D4AF37', borderRadius: '8px', padding: '0.5rem', fontSize: '0.78rem', cursor: imgLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                {imgLoading ? '⏳ Generating...' : '✦ Generate Image'}
              </button>
            </div>
          </div>

          {/* Image panel */}
          <div style={{ width: '300px', flexShrink: 0 }}>
            <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Image</div>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', overflow: 'hidden', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {image ? (
                <img src={image} alt="generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#333', fontSize: '0.82rem', padding: '1rem' }}>
                  {imgLoading ? '⏳ generating...' : 'Click Generate Image →'}
                </div>
              )}
            </div>
            {imgError && <div style={{ fontSize: '0.75rem', color: '#ff7b72', marginTop: '0.5rem' }}>⚠ {imgError}</div>}
            {image && (
              <button onClick={downloadImage} style={{ width: '100%', marginTop: '0.75rem', background: '#2E7D32', border: 'none', borderRadius: '8px', padding: '0.6rem', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                ↓ Download Image
              </button>
            )}
          </div>

        </div>

        {/* Status bar */}
        <div style={{ marginTop: '2rem', background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#444', display: 'flex', justifyContent: 'space-between' }}>
          <div>🗺️ Map of Pi · {channel} · {post.label}</div>
          <div>ANTCPU ADS · post builder</div>
        </div>

      </div>
    </div>
  );
}

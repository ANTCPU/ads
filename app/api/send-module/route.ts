import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { notifyDiscord, DC } from '../../lib/discord';

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_CSS = `
  body{margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#fff}
  .wrap{max-width:560px;margin:0 auto;padding:2rem 1.25rem}
  .label{font-size:.65rem;color:#555;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem}
  .step{display:flex;gap:.85rem;align-items:flex-start;margin-bottom:1.25rem}
  .step-body .title{font-weight:700;font-size:.9rem;margin-bottom:.2rem}
  .step-body .desc{font-size:.8rem;color:#aaa;line-height:1.5}
  .footer{border-top:1px solid #1a1a1a;padding-top:1.25rem;margin-top:2rem;font-size:.72rem;color:#555;text-align:center;line-height:1.8}
  .footer a{color:#555}
`;

// ─── Flag lookup — auto-derive when not passed ────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  'Nigeria': '🇳🇬', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧',
  'Finland': '🇫🇮', 'Saudi Arabia': '🇸🇦', 'Egypt': '🇪🇬',
  'Ghana': '🇬🇭', 'Kenya': '🇰🇪', 'South Africa': '🇿🇦',
  'India': '🇮🇳', 'Philippines': '🇵🇭', 'Indonesia': '🇮🇩',
  'Germany': '🇩🇪', 'France': '🇫🇷', 'Brazil': '🇧🇷',
  'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Japan': '🇯🇵',
  'China': '🇨🇳', 'Mexico': '🇲🇽', 'Argentina': '🇦🇷',
  'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩', 'Vietnam': '🇻🇳',
  'Ethiopia': '🇪🇹', 'Tanzania': '🇹🇿', 'Uganda': '🇺🇬',
};

function championHtml(p: {
  firstName: string;
  shopName: string;
  country: string;
  flag: string;
  shareLink: string;
  arenaLink: string;
  lbLink: string;
  dashLink: string;
  isTeam: boolean;
  days: number;
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
  <div class="wrap">
    <div class="label">🗺️ Country Champion · ${p.flag} ${p.country}</div>
    <h1 style="font-size:1.4rem;font-weight:800;margin:0 0 0.5rem">You're live, ${p.firstName}. ⚡</h1>
    <p style="color:#aaa;font-size:0.9rem;line-height:1.6;margin:0 0 1.5rem">
      <strong style="color:#fff">${p.shopName}</strong> is now representing
      <strong style="color:#fff">${p.flag} ${p.country}</strong> in the Map of Pi Arena.
      Your 10 antbots are deployed. Now it's time to climb.
    </p>
    <a href="${p.arenaLink}" style="display:block;background:#22c55e;color:#000;text-align:center;padding:0.9rem;border-radius:10px;font-weight:700;text-decoration:none;margin-bottom:2rem">
      View Your Shop in the Arena →
    </a>
    <div class="label">The Tier Ladder — Where You're Headed</div>
    <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap">
      ${[['🟢','Entry','You are here','#22c55e'],['🔵','Rising','100 pts','#0070f3'],['🟣','Featured','300 pts','#7928ca'],['🟠','Top Tier','750 pts','#f0883e']].map(([e,l,d,c])=>`
      <div style="flex:1;min-width:100px;background:#111;border:1px solid ${c}40;border-radius:10px;padding:0.75rem;text-align:center">
        <div style="font-size:1.2rem">${e}</div>
        <div style="font-weight:700;font-size:0.82rem;color:${c}">${l}</div>
        <div style="font-size:0.72rem;color:#555">${d}</div>
      </div>`

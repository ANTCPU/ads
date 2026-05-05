// ============================================================
// antbots/index.ts — Antbot Pod Registry
// 10 antbots, each owns a channel + task
// Prompt format: output only, no preamble, no commentary
// Monitored by ADS agent
// ============================================================

export type AntbotStatus = 'idle' | 'running' | 'complete' | 'error';

export interface Antbot {
  id: number;
  name: string;
  channel: string;
  task: string;
  icon: string;
  status: AntbotStatus;
  output: string | null;
  tokens: number;
}

const CLIENT = `Client: Map of Pi (mapofpi.com) — 2.1M+ users, 148K sellers, Pi commerce platform, v1.8 live. Won 2024 Pi Commerce Hackathon. Free to use, KYC verified, no bank account needed. v2 (online shopping) coming soon. Casual tone, community voice, no hype.`;

const PREFIX = `You are the ANTCPU ADS Agent. Output only ready-to-post copy. No preamble, no review, no commentary. Just the content.\n\n${CLIENT}\n\n`;

export const ANTBOT_POD: Antbot[] = [
  {
    id: 1,
    name: 'ANT-01',
    channel: 'Brand Awareness',
    task: PREFIX + 'Write 3 brand positioning statements for Map of Pi. Each under 2 sentences. Target: new Pi Network users discovering the app for the first time.',
    icon: '📡',
    status: 'idle',
    output: null,
    tokens: 0,
  },
  {
    id: 2,
    name: 'ANT-02',
    channel: 'Google Ads',
    task: PREFIX + 'Write 3 Google Search ad sets for Map of Pi v1.8. Each set: Headline (max 30 chars) + Description (max 90 chars). Target: people searching "Pi Network marketplace" or "buy with Pi".',
    icon: '🔍',
    status: 'idle',
    output: null,
    tokens: 0,
  },
  {
    id: 3,
    name: 'ANT-03',
    channel: 'Meta / Instagram',
    task: PREFIX + 'Write 2 Instagram posts for Map of Pi. Each: caption (max 150 chars) + CTA + 5 hashtags. Focus on merchant discovery and trust scores.',
    icon: '📸',
    status: 'idle',
    output: null,
    tokens: 0,
  },
  {
    id: 4,
    name: 'ANT-04',
    channel: 'Twitter / X',
    task: PREFIX + 'Write 5 tweets for Map of Pi. Mix: 2 stats-based, 2 utility-focused, 1 community. Each under 280 chars. Include relevant hashtags.',
    icon: '🐦',
    status: 'idle',
    output: null,
    tokens: 0,
  },
  {
    id: 5,
    name: 'ANT-05',
    channel: 'Reddit',
    task: PREFIX + 'Write a Reddit post for r/PiNetwork. Title + body (max 200 words). Announce Map of Pi v1.8 milestones: 2.1M users, 148K sellers, edit reviews, notifications. Conversational, no marketing speak.',
    icon: '👾',
    status: 'idle',
    output: null,
    tokens: 0,
  },
  {
    id: 6,
    name: 'ANT-06',
    channel: 'YouTube',
    task: PREFIX + 'Write a 60-second YouTube Shorts script for Map of Pi. Show a seller adding their shop to the map, a buyer finding them, leaving a review, editing it. Upbeat but real. Include on-screen text cues.',
    icon: '🎬',
    status: 'idle',
    output: null,
    tokens: 0,
  },
  {
    id: 7,
    name: 'ANT-07',
    channel: 'TikTok',
    task: PREFIX + 'Write a TikTok concept for Map of Pi targeting crypto-curious Gen Z. Hook (first 3 seconds) + 3 scene breakdown + CTA. Angle: you can actually spend Pi on real things near you.',
    icon: '🎵',
    status: 'idle',
    output: null,
    tokens: 0,
  },
  {
    id: 8,
    name: 'ANT-08',
    channel: 'SEO / Content',
    task: PREFIX + 'Write a 200-word SEO blog intro for the article: "What is Map of Pi and how does it work in 2025?" Include keywords: Pi Network marketplace, buy with Pi, Pi commerce, Map of Pi sellers.',
    icon: '📝',
    status: 'idle',
    output: null,
    tokens: 0,
  },
  {
    id: 9,
    name: 'ANT-09',
    channel: 'Discord / Community',
    task: PREFIX + 'Write a Discord announcement for Map of Pi v1.8 for the Pi Network community server. Max 150 words. Announce: edit reviews + notifications features. End with a question to drive replies.',
    icon: '💬',
    status: 'idle',
    output: null,
    tokens: 0,
  },
  {
    id: 10,
    name: 'ANT-10',
    channel: 'Email Campaign',
    task: PREFIX + 'Write a welcome email for new Map of Pi sellers. Subject line + 3 short paragraphs. Para 1: welcome + what Map of Pi is. Para 2: how to set up their shop. Para 3: what happens next + CTA.',
    icon: '📧',
    status: 'idle',
    output: null,
    tokens: 0,
  },
];

export default ANTBOT_POD;

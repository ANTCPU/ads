// app/internship/week/[week]/page.tsx
// ─── Weekly summary page ──────────────────────────────────────────────────────
//
// Version: v1.0
// Updated: 2026-10-19
//
// Routes: /internship/week/1  /internship/week/2
//         /internship/week/3  /internship/week/4
//
// Shows: week theme, gate list, progress bar, CTA to office + submit
// Visitor tracking: session ping on mount → real last_seen signal
// ─────────────────────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation';
import WeekClient   from './WeekClient';

const WEEKS: Record<string, {
  name:   string;
  theme:  string;
  range:  string;
  locked: boolean;
  gates:  { id: string; pct: number; label: string; icon: string }[];
}> = {
  '1': {
    name:   'Explorer',
    theme:  'Get oriented. Meet the arena. Make your first move.',
    range:  '5% → 25%',
    locked: false,
    gates: [
      { id: 'd1',  pct: 5,  label: 'Register & Introduce Yourself',  icon: '👋' },
      { id: 'd2',  pct: 10, label: 'Complete Your Profile',           icon: '🪪' },
      { id: 'd3',  pct: 15, label: 'Explore the Arena',               icon: '🔭' },
      { id: 'd4',  pct: 20, label: 'First Action in the Arena',       icon: '⚡' },
      { id: 'd5',  pct: 22, label: 'First Submission',                icon: '💬' },
      { id: 'd6',  pct: 24, label: 'Give Peer Feedback',              icon: '🤝' },
      { id: 'd7',  pct: 25, label: 'Week 1 Reflection',               icon: '📝' },
    ],
  },
  '2': {
    name:   'Builder',
    theme:  'Plan your build. Ship your first real work.',
    range:  '30% → 50%',
    locked: false,
    gates: [
      { id: 'd8',  pct: 30, label: 'Week 2 Brief — Plan Your Build',  icon: '⚡' },
      { id: 'd9',  pct: 35, label: 'Research & Analyze',              icon: '🔍' },
      { id: 'd10', pct: 38, label: 'Build Day 1',                     icon: '📋' },
      { id: 'd11', pct: 42, label: 'Build Day 2',                     icon: '💡' },
      { id: 'd12', pct: 46, label: 'Ship & Submit',                   icon: '🔧' },
      { id: 'd13', pct: 48, label: 'Peer Review',                     icon: '📤' },
      { id: 'd14', pct: 50, label: 'Week 2 Reflection',               icon: '📝' },
    ],
  },
  '3': {
    name:   'Collaborator',
    theme:  'Meet your team. Build together. Ship as one.',
    range:  '55% → 75%',
    locked: false,
    gates: [
      { id: 'd15', pct: 55, label: 'Meet Your Team',                  icon: '🤝' },
      { id: 'd16', pct: 58, label: 'Team Brief — Define the Project', icon: '💬' },
      { id: 'd17', pct: 62, label: 'Build Together Day 1',            icon: '🔨' },
      { id: 'd18', pct: 65, label: 'Build Together Day 2',            icon: '🔨' },
      { id: 'd19', pct: 70, label: 'Ship the Team Project',           icon: '📦' },
      { id: 'd20', pct: 72, label: 'Cross-Track Peer Review',         icon: '✅' },
      { id: 'd21', pct: 75, label: 'Week 3 Reflection',               icon: '📝' },
    ],
  },
  '4': {
    name:   'Finalist',
    theme:  'Final build. Showcase your work. Selection day.',
    range:  '80% → 100%',
    locked: true,
    gates: [
      { id: 'd22',      pct: 80,  label: 'Claim Your Role',                  icon: '🎯' },
      { id: 'd23',      pct: 85,  label: 'Final Build — Ship It',            icon: '🏗️' },
      { id: 'd24',      pct: 95,  label: 'Final Submission & Showcase',      icon: '🏆' },
      { id: 'd25-final',pct: 100, label: 'Selection Day',                    icon: '🏆' },
    ],
  },
};

export async function generateMetadata(
  { params }: { params: Promise<{ week: string }> }
) {
  const { week } = await params;
  const w = WEEKS[week];
  if (!w) return { title: 'Week Not Found' };
  return {
    title:       `Week ${week} — ${w.name} · ANTCPU Internship`,
    description: w.theme,
  };
}

export default async function WeekPage(
  { params }: { params: Promise<{ week: string }> }
) {
  const { week } = await params;
  const w = WEEKS[week];
  if (!w) notFound();
  return <WeekClient week={Number(week)} data={w} />;
}

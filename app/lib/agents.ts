// app/lib/agents.ts
// ─── Arena Agent Registry ─────────────────────────────────────────────────────
// Single source of truth for all Arena agent identities.
// Used by ads-agent (LLM runner) and agent (data feed) to inject context.
//
// Agents are behind-the-scenes workers — they don't speak to users directly.
// They process, score, review, notify, and report.
// Each has a role, a number, and Arena awareness.
//
// The 10 antbots are human-in-the-loop challengers assigned to country champions.
// When a champion launches an ad, 10 antbots activate — sharing, clicking,
// engaging — driving the ad up the leaderboard through real activity.
// ─────────────────────────────────────────────────────────────────────────────

export type AgentId = 'scout' | 'aria' | 'herald' | 'ledger' | 'mac' | 'antbot';

export type AgentDef = {
  id:     AgentId;
  num:    number;
  name:   string;
  icon:   string;
  role:   string;
  knows:  string;
};

export const AGENT_REGISTRY: AgentDef[] = [
  {
    id:    'scout',
    num:   1,
    name:  'Scout',
    icon:  '🔍',
    role:  'Points and ranking engine. Calculates scores, assigns tiers, awards badges.',
    knows: 'Every active ad, its points, clicks, shares, tier, and rank position. Fires after every engagement.',
  },
  {
    id:    'aria',
    num:   2,
    name:  'Aria',
    icon:  '🦋',
    role:  'Ad review engine. Checks quality, resolves URLs, auto-approves returning brands.',
    knows: 'Brand URL registry, seed phrase patterns, prior approved ads per user. First ads queue for human review.',
  },
  {
    id:    'herald',
    num:   3,
    name:  'Herald',
    icon:  '✉️',
    role:  'Notification delivery. Writes to the in-app envelope for every user.',
    knows: 'Notification types: approved, rejected, points, rank, nudge, aria, info. Delivered on next login.',
  },
  {
    id:    'ledger',
    num:   4,
    name:  'Ledger',
    icon:  '📊',
    role:  'Analytics and numbers. Tracks Arena-wide stats, brand performance, daily activity.',
    knows: 'Total ads, users, clicks today, shares today, top brand, membership tier breakdown.',
  },
  {
    id:    'mac',
    num:   5,
    name:  'MAC',
    icon:  '🗺️',
    role:  'Map of Pi agent. Serves the Pi Network community in the Arena.',
    knows: 'Map of Pi brand, Pi Pioneer badge holders, Pi commerce category ads.',
  },
  {
    id:    'antbot',
    num:   0,
    name:  'Antbot',
    icon:  '🤖',
    role:  'Human-in-the-loop challenger. One of 10 antbots assigned to a country champion\'s ad launch.',
    knows: 'Assigned ad, champion brand, share targets, click targets. Reports activity back to Scout.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAgent(id: AgentId): AgentDef | undefined {
  return AGENT_REGISTRY.find(a => a.id === id);
}

export function getAgentByNum(num: number): AgentDef | undefined {
  return AGENT_REGISTRY.find(a => a.num === num);
}

// ─── Arena context string ─────────────────────────────────────────────────────
// Injected into every LLM prompt via ads-agent.
// Gives the model enough Arena awareness to assist any user accurately.

export const ARENA_CONTEXT = `
The ANTCPU AD Arena is a competitive ad network where brands earn points through real engagement.
Points formula: clicks×3, shares×5, likes×2, boosts×5, reactions×1 + tier bonus + rank bonus.
Tiers: Entry (0pts) → Rising (100pts) → Featured (300pts) → Top Tier (750pts).
Membership: trial → member → rising → veteran → champion → subscriber.
Rankings update live via Scout after every interaction.
Aria reviews new ads — first ads queue for human review, returning brands auto-approve if clean.
Herald delivers notifications to the in-app envelope.
Country champions get 10 antbots — human challengers who drive real engagement on their ad launch.
The Arena has brands from Pi Network, photography, marketing, and more.
`.trim();

// ─── Build agent system prompt ────────────────────────────────────────────────
// Used by ads-agent/route.ts to prepend context to every LLM call.

export function buildAgentPrompt(agentId: AgentId | null, userPrompt: string): string {
  const agent = agentId ? getAgent(agentId) : null;
  const identity = agent
    ? `You are ${agent.name} (${agent.icon}), an ANTCPU Arena agent.\nRole: ${agent.role}\nYou know: ${agent.knows}`
    : `You are an ANTCPU Arena assistant.`;

  return `${identity}\n\n${ARENA_CONTEXT}\n\n${userPrompt}`;
}

// app/modules/index.ts
// ─── Module Registry ──────────────────────────────────────────────────────────
// Single source of truth for all Arena modules.
//
// Changes Sep 2026:
//   — schedule removed (absorbed into campaign-hub)
//   — region-map removed (replaced by world-map)
//   — posts renamed → Quick Share (repurposed)
//   — world-map, agents, media added
//   — featured-candidates moved trial → premium (admin-only)
//   — icon, tag, size fields added to all entries
// ─────────────────────────────────────────────────────────────────────────────

import { ModuleDefinition }        from './types';
import CreateAdModule              from './create-ad';
import ShareModule                 from './share';
import LeaderboardModule           from './leaderboard';
import ArchiveModule               from './archive';
import BadgesModule                from './badges';
import LoyaltyModule               from './loyalty';
import SlidePanelModule            from './slide-panel';
import WorldMapModule              from './world-map';
import CampaignHubModule           from './campaign-hub';
import PostsModule                 from './posts';
import ChatModule                  from './chat';
import AgentsModule                from './agents';
import MediaModule                 from './media';
import VideoFeedModule             from './video-feed';
import YouTubeLiveModule           from './youtube-live';
import FeaturedCandidatesModule    from './featured-candidates';

// ─── Registry ─────────────────────────────────────────────────────────────────

export const MODULE_REGISTRY: ModuleDefinition[] = [

  // ── Trial ─────────────────────────────────────────────────────────────────
  {
    id:        'create-ad',
    tier:      'trial',
    icon:      '🚀',
    label:     '🚀 Advertise Here',
    desc:      'Create and launch an ad in this arena',
    size:      'standard',
    component: CreateAdModule,
  },
  {
    id:        'share',
    tier:      'trial',
    icon:      '🔗',
    label:     '🔗 Share Arena',
    desc:      'Share this arena with one tap',
    size:      'compact',
    component: ShareModule,
  },
  {
    id:        'leaderboard',
    tier:      'trial',
    icon:      '🏆',
    label:     '🏆 Leaderboard',
    desc:      'Top performing ads ranked by points',
    size:      'standard',
    component: LeaderboardModule,
  },
  {
    id:        'archive',
    tier:      'trial',
    icon:      '📦',
    label:     '📦 Archive',
    desc:      'Past campaigns from all Arena brands',
    size:      'compact',
    component: ArchiveModule,
  },
  {
    id:        'badges',
    tier:      'trial',
    icon:      '🏅',
    label:     '🏅 Badges',
    desc:      'Earned badges and Arena achievements',
    size:      'compact',
    component: BadgesModule,
  },
  {
    id:        'loyalty',
    tier:      'trial',
    icon:      '🔄',
    label:     '🔄 Loyalty',
    desc:      'Trial status, streak, and loyalty restart',
    size:      'compact',
    component: LoyaltyModule,
  },
  {
    id:        'slide-panel',
    tier:      'trial',
    icon:      '🌍',
    label:     '🌍 Country Panel',
    desc:      'Top countries with full list slide-out',
    size:      'compact',
    component: SlidePanelModule,
  },

  // ── Basic ─────────────────────────────────────────────────────────────────
  {
    id:        'world-map',
    tier:      'basic',
    icon:      '🗺️',
    label:     '🗺️ World Map',
    desc:      'Live ad locations pinned on a world map',
    tag:       'new',
    size:      'full',
    component: WorldMapModule,
  },
  {
    id:        'campaign-hub',
    tier:      'basic',
    icon:      '📡',
    label:     '📡 Campaign Hub',
    desc:      'Manage campaigns, bookings, and share tools',
    tag:       'enhanced',
    size:      'full',
    component: CampaignHubModule,
  },

  // ── Standard ──────────────────────────────────────────────────────────────
  {
    id:        'posts',
    tier:      'standard',
    icon:      '🔗',
    label:     '🔗 Quick Share',
    desc:      'Generate platform-ready share copy for your ads',
    tag:       'enhanced',
    size:      'standard',
    component: PostsModule,
  },
  {
    id:        'chat',
    tier:      'standard',
    icon:      '🦋',
    label:     '🦋 Ask Aria',
    desc:      'Direct line to Aria — unlocks at 10 pts',
    size:      'compact',
    component: ChatModule,
  },
  {
    id:        'agents',
    tier:      'standard',
    icon:      '⚡',
    label:     '⚡ Agents Hub',
    desc:      'Command centre for all Arena agents + antbots',
    tag:       'new',
    size:      'full',
    component: AgentsModule,
  },
  {
    id:        'media',
    tier:      'standard',
    icon:      '🎨',
    label:     '🎨 Media',
    desc:      'AI-generated images for your ads — gallery + generate',
    tag:       'new',
    size:      'full',
    component: MediaModule,
  },

  // ── Premium ───────────────────────────────────────────────────────────────
  {
    id:        'video-feed',
    tier:      'premium',
    icon:      '🎬',
    label:     '🎬 Video Feed',
    desc:      'Brand video ads in the Arena feed',
    size:      'standard',
    component: VideoFeedModule,
  },
  {
    id:        'youtube-live',
    tier:      'premium',
    icon:      '▶️',
    label:     '▶️ YouTube Live',
    desc:      'Live stream from your YouTube channel',
    size:      'standard',
    component: YouTubeLiveModule,
  },
  {
    id:        'featured-candidates',
    tier:      'premium',
    icon:      '⭐',
    label:     '⭐ Featured Candidates',
    desc:      'Engagement-ranked list — set the featured badge holder',
    tag:       'admin',
    size:      'full',
    component: FeaturedCandidatesModule,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAvailableModules(subscription: string): ModuleDefinition[] {
  const order: Record<string, number> = { trial: 0, basic: 1, standard: 2, premium: 3 };
  const userLevel = order[subscription] ?? 0;
  return MODULE_REGISTRY.filter(m => (order[m.tier] ?? 0) <= userLevel);
}

export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find(m => m.id === id);
}

export function getModulesByTag(tag: string): ModuleDefinition[] {
  return MODULE_REGISTRY.filter(m => m.tag === tag);
}

export function getModulesByTier(tier: string): ModuleDefinition[] {
  return MODULE_REGISTRY.filter(m => m.tier === tier);
}

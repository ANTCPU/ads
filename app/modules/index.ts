import { ModuleDefinition } from './types';
import RegionalMapModule   from './region-map';
import LeaderboardModule   from './leaderboard';
import CampaignHubModule   from './campaign-hub';
import CreateAdModule      from './create-ad';
import VideoFeedModule     from './video-feed';
import ScheduleModule      from './schedule';
import PostsModule         from './posts';
import ShareModule         from './share';
import ChatModule          from './chat';
import YouTubeLiveModule   from './youtube-live';
import ArchiveModule       from './archive';
import BadgesModule        from './badges';
import LoyaltyModule       from './loyalty';

export const MODULE_REGISTRY: ModuleDefinition[] = [
  { id: 'create-ad',    tier: 'trial',    label: '🚀 Advertise Here', desc: 'Create an ad in this arena',              component: CreateAdModule    },
  { id: 'share',        tier: 'trial',    label: '🔗 Share Arena',    desc: 'Share this arena with one tap',           component: ShareModule       },
  { id: 'archive',      tier: 'trial',    label: '📦 Archive',        desc: 'Past campaigns from all Arena brands',    component: ArchiveModule     },
  { id: 'leaderboard',  tier: 'trial',    label: '🏆 Leaderboard',    desc: 'Top performing ads in the Arena',         component: LeaderboardModule },
  { id: 'badges',       tier: 'trial',    label: '🏅 Badges',         desc: 'Your earned badges in the Arena',         component: BadgesModule      },
  { id: 'loyalty',      tier: 'trial',    label: '🔄 Loyalty',        desc: 'Trial status and loyalty restart',        component: LoyaltyModule     },
  { id: 'region-map',   tier: 'basic',    label: '🌍 Regional Map',   desc: 'Live signup regions across the network',  component: RegionalMapModule },
  { id: 'campaign-hub', tier: 'basic',    label: '📡 Campaign Hub',   desc: 'Active campaigns grouped by tier',        component: CampaignHubModule },
  { id: 'posts',        tier: 'standard', label: '📝 Posts',          desc: 'Brand posts and updates',                 component: PostsModule       },
  { id: 'schedule',     tier: 'standard', label: '📅 Schedule',       desc: 'Ad activity by day of week',              component: ScheduleModule    },
  { id: 'chat',         tier: 'standard', label: '🦋 Ask Aria',       desc: 'Direct line to Aria — unlocks at 10pts',  component: ChatModule        },
  { id: 'video-feed',   tier: 'premium',  label: '🎬 Video Feed',     desc: 'Brand media ads',                         component: VideoFeedModule   },
  { id: 'youtube-live', tier: 'premium',  label: '▶️ YouTube Live',   desc: 'Live stream from your YouTube channel',   component: YouTubeLiveModule },
];

export function getAvailableModules(subscription: string) {
  const order: Record<string, number> = { trial: 0, basic: 1, standard: 2, premium: 3 };
  const userLevel = order[subscription] ?? 0;
  return MODULE_REGISTRY.filter(m => (order[m.tier] ?? 0) <= userLevel);
}

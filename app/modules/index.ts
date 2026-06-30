import { ModuleDefinition } from './types';
import RegionalMapModule from './region-map';
import LeaderboardModule from './leaderboard';
import CampaignHubModule from './campaign-hub';
import CreateAdModule from './create-ad';
import VideoFeedModule from './video-feed';
import ScheduleModule from './schedule';
import PostsModule from './posts';
import ShareModule from './share';

export const MODULE_REGISTRY: ModuleDefinition[] = [
  { id: 'create-ad',    label: '🚀 Advertise Here', desc: 'Create an ad in this arena',             component: CreateAdModule },
  { id: 'region-map',   label: '🌍 Regional Map',   desc: 'Live signup regions across the network', component: RegionalMapModule },
  { id: 'leaderboard',  label: '🏆 Leaderboard',    desc: 'Top performing ads in the Arena',        component: LeaderboardModule },
  { id: 'campaign-hub', label: '📡 Campaign Hub',   desc: 'Active campaigns grouped by tier',       component: CampaignHubModule },
  { id: 'share',        label: '🔗 Share Arena',    desc: 'Share this arena with one tap',          component: ShareModule },
  { id: 'video-feed',   label: '🎬 Video Feed',     desc: 'Brand media ads',                        component: VideoFeedModule },
  { id: 'schedule',     label: '📅 Schedule',       desc: 'Ad activity by day of week',             component: ScheduleModule },
  { id: 'posts',        label: '📝 Posts',          desc: 'Brand posts and updates',                component: PostsModule },
];

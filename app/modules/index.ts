import { ModuleDefinition } from './types';
import RegionalMapModule from './region-map';

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: 'region-map',
    label: '🌍 Regional Map',
    desc: 'Live signup regions across the network',
    component: RegionalMapModule,
  },
  // SESSION: add more modules here as they are built
  // { id: 'share',        label: '🔗 Share',        desc: 'Share this arena',              component: ShareModule },
  // { id: 'leaderboard',  label: '🏆 Leaderboard',  desc: 'Top performing ads',            component: LeaderboardModule },
  // { id: 'campaign-hub', label: '📡 Campaign Hub', desc: 'Active campaigns and targets',  component: CampaignHubModule },
  // { id: 'video-feed',   label: '🎬 Video Feed',   desc: 'Brand video ads',               component: VideoFeedModule },
  // { id: 'posts',        label: '📝 Posts',        desc: 'Brand posts and updates',       component: PostsModule },
];

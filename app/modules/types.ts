import { SupabaseClient } from '@supabase/supabase-js';

export type ModuleUser = {
  email: string;
  name: string;
  brand: string;
  trialStatus: string;
};

export type Ad = {
  id: string;
  brand: string;
  title: string;
  url: string;
  description: string;
  category: string;
  status: string;
  tier: string;
  pinned: boolean;
  email: string;
  points?: number;
  click_count?: number;
  share_count?: number;
  image_url?: string;
};

export type ModuleContext = {
  slug: string;
  user: ModuleUser;
  ads: Ad[];
  supabase: SupabaseClient;
};

export type ModuleDefinition = {
  id: string;
  label: string;
  desc: string;
  component: React.FC<ModuleContext>;
};

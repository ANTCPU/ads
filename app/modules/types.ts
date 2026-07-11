import { SupabaseClient } from '@supabase/supabase-js';

// ─── Module Types ─────────────────────────────────────────────────────────────
// ModuleContext is passed to every module component.
// isSuper: true only in /dashboard/admin preview — unlocks full control panel
// subscription: future billing tier — not enforced yet, used for upgrade prompts
// ─────────────────────────────────────────────────────────────────────────────

export type ModuleUser = {
  email:       string;
  name:        string;
  brand:       string;
  trialStatus: string;
};

export type Ad = {
  id:          string;
  brand:       string;
  title:       string;
  url:         string;
  description: string;
  category:    string;
  status:      string;
  tier:        string;
  pinned:      boolean;
  email:       string;
  points?:     number;
  click_count?: number;
  share_count?: number;
  image_url?:  string;
};

// Subscription tier — not enforced yet
// Used only to show upgrade prompts in locked modules
export type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'premium';

export type ModuleContext = {
  slug:         string;
  user:         ModuleUser;
  ads:          Ad[];
  supabase:     SupabaseClient;
  isSuper?:     boolean;           // true = full control panel in /dashboard/admin
  subscription?: SubscriptionTier; // future billing — not enforced yet
};

export type ModuleDefinition = {
  id:           string;
  label:        string;
  desc:         string;
  tier:         SubscriptionTier;  // which plan unlocks this module
  component:    React.FC<ModuleContext>;
};

import { SupabaseClient } from '@supabase/supabase-js';

// ─── Module Types ─────────────────────────────────────────────────────────────
// ModuleContext is the single prop passed to every module component.
//
// isSuper:      true only in /dashboard/admin preview — unlocks full control panel
// subscription: billing tier — not enforced yet, used for upgrade prompts only
//
// Ad mirrors the ads table shape. Optional fields reflect columns that may be
// null at creation (image_url, country, champion fields) or added over time.
//
// Last updated: Sep 2026
//   — country champion + reaction fields added
//   — ModuleDefinition: icon, tag, size added for enhanced module picker
// ─────────────────────────────────────────────────────────────────────────────

export type ModuleUser = {
  email:       string;
  name:        string;
  brand:       string;
  trialStatus: string;
};

export type Ad = {
  // ── Core ──────────────────────────────────────────────────────────────────
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

  // ── Engagement counters ───────────────────────────────────────────────────
  points?:         number;
  click_count?:    number;
  share_count?:    number;
  like_count?:     number;
  boost_count?:    number;
  reaction_count?: number;
  rank_position?:  number;

  // ── Media ─────────────────────────────────────────────────────────────────
  image_url?:  string;

  // ── Country champion ──────────────────────────────────────────────────────
  country?:             string;
  is_country_champion?: boolean;

  // ── Campaign tagging ──────────────────────────────────────────────────────
  campaign?: string;
};

// ─── Subscription tier ────────────────────────────────────────────────────────
export type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'premium';

// ─── Module tag ───────────────────────────────────────────────────────────────
// Used in the module picker to surface new, enhanced, admin-only, and AI modules.
export type ModuleTag = 'new' | 'enhanced' | 'admin' | 'ai';

// ─── Module size hint ─────────────────────────────────────────────────────────
// Renderer hint — compact modules get less padding in the slot.
// Does not affect the module component itself.
export type ModuleSize = 'compact' | 'standard' | 'full';

// ─── ModuleContext ────────────────────────────────────────────────────────────
export type ModuleContext = {
  slug:          string;
  user:          ModuleUser;
  ads:           Ad[];
  supabase:      SupabaseClient;
  isSuper?:      boolean;
  subscription?: SubscriptionTier;
};

// ─── ModuleDefinition ─────────────────────────────────────────────────────────
// Registered in app/modules/index.ts via MODULE_REGISTRY.
export type ModuleDefinition = {
  id:        string;
  label:     string;
  desc:      string;
  tier:      SubscriptionTier;
  component: React.FC<ModuleContext>;
  icon?:     string;       // standalone icon — shown in picker card
  tag?:      ModuleTag;    // badge: new | enhanced | admin | ai
  size?:     ModuleSize;   // render hint: compact | standard | full
};

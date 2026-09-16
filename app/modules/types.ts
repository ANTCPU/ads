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
// Last updated: Sep 2026 — added country champion + reaction fields
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
  // Cloudinary URL — null at creation, set via upload flow
  image_url?:  string;

  // ── Country champion — Map of Pi membership arena ─────────────────────────
  // Written by create-shop-ad and champion assignment flows
  country?:             string;
  is_country_champion?: boolean;

  // ── Campaign tagging ──────────────────────────────────────────────────────
  // e.g. 'mapofpi' — used to scope queries to a brand sub-arena
  campaign?: string;
};

// ─── Subscription tier ────────────────────────────────────────────────────────
// Not enforced yet — used only to show upgrade prompts in locked modules.
// Will gate module access when billing is live (Phase 4).
export type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'premium';

// ─── ModuleContext ────────────────────────────────────────────────────────────
// Passed as props to every module component.
// supabase client is the anon client — modules must respect RLS.
export type ModuleContext = {
  slug:          string;
  user:          ModuleUser;
  ads:           Ad[];
  supabase:      SupabaseClient;
  isSuper?:      boolean;           // true = full control panel in /dashboard/admin
  subscription?: SubscriptionTier; // future billing — not enforced yet
};

// ─── ModuleDefinition ─────────────────────────────────────────────────────────
// Registered in app/modules/index.ts via MODULE_REGISTRY.
// tier controls which subscription plan unlocks this module.
export type ModuleDefinition = {
  id:        string;
  label:     string;
  desc:      string;
  tier:      SubscriptionTier;
  component: React.FC<ModuleContext>;
};

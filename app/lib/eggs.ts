// app/lib/eggs.ts
// ─── Easter Egg Registry ──────────────────────────────────────────────────────
//
// Each egg is a named slot. Active eggs have a config. Null = framed but empty.
// The system knows the slot exists — it is not missing, it has no value yet.
//
// Finding egg-1 on /health is an elevated intern signal.
// It means the challenger understands stable code, architecture, and curiosity.
//
// Eggs 2–10 are reserved. They will be filled in future cohorts.
// Do not remove null slots — the frame is the intention.
// ─────────────────────────────────────────────────────────────────────────────

export type EggConfig = {
  active: boolean
  trigger: string        // what the challenger types
  reward: string         // what they receive
  code: string           // code they submit to mentor
  message: string        // what they see when they find it
}

export const EGGS: Record<string, EggConfig | null> = {
  'easter-egg1': {
    active: true,
    trigger: 'easter-egg1',
    reward: 'architect-badge',
    code: 'ARCH',
    message: `You found the health page.\nMost people never look here.\nThe fact that you did tells us something.\n\nSubmit code ARCH-[your handle] to your mentor.\nThis unlocks the Architect badge — it is not in the public registry.`,
  },
  'easter-egg2':  null,
  'easter-egg3':  null,
  'easter-egg4':  null,
  'easter-egg5':  null,
  'easter-egg6':  null,
  'easter-egg7':  null,
  'easter-egg8':  null,
  'easter-egg9':  null,
  'easter-egg10': null,
}

// Resolve an egg by trigger input.
// Returns the config if active, null if slot exists but empty, undefined if unknown.
export function resolveEgg(input: string): EggConfig | null | undefined {
  const entry = Object.values(EGGS).find(
    (egg) => egg !== null && egg.trigger === input.trim().toLowerCase()
  )
  if (entry !== undefined) return entry  // found active egg
  // check if input matches a key directly (future: null slot typed exactly)
  if (input.trim().toLowerCase() in EGGS) return null
  return undefined  // unknown — silence
}

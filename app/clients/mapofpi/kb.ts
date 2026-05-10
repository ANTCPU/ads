// ============================================================
// kb.ts — Map of Pi Knowledge Base
// Location: clients/mapofpi/kb.ts
// Source: mapofpi.com scrape — 2026-04-25
// Used by: ADS agent prompt + antbot task briefings
// ============================================================

export const MAPOFPI_KB = {
  brand: {
    primaryColor: '#2E7D32',
    accentColor: '#D4AF37',
    logoUrl: 'https://avatars.githubusercontent.com/u/166511995?s=200&v=4',
    imagePrompt: 'Dark background with glowing green map pin icon, gold Pi symbol inside the pin, subtle gold grid lines forming a world map, deep black background, cinematic lighting, no text, no words, square format, premium brand aesthetic.',
  },
  name: "Map of Pi",
  url: "https://mapofpi.com",
  tagline: "More than just a map — it's the future of Pi eCommerce",
  version: "1.8",
  versionNext: "2.0 — online shopping, coming soon",

  stats: {
    users: "2.1M+ registered users",
    sellers: "148,000 sellers",
    transactions: "173,000+ completed buyer-seller interactions",
    piPrice: "$0.17 USD",
    marketCap: "$1.75B USD",
    cmcRank: 42,
    launched: "October 2024",
  },

  awards: [
    "2024 Pi Commerce Hackathon Winner — Pi Network",
    "Featured at Pi Fest",
    "Pi Day 2026 celebration participant",
  ],

  keyFeatures: [
    "Global map of Pi-accepting merchants",
    "Search by seller details, location, Pi username, email",
    "Trust scores and buyer reviews",
    "QR codes and menu items for sellers",
    "Pi Authentication + Pi Payments integration",
    "Holiday Seller markers (seasonal events)",
    "EscrowPi — decentralized escrow for safe transactions",
    "M.A.C. — in-app chatbot guide",
    "KYC verified via Pi Network blockchain",
    "Free to use, no bank account required",
    "Available in: English, Hindi, German, Akan/Twi + more",
  ],

  ecosystem: {
    platform: "Pi Browser (Pi Network)",
    blockchain: "Pi Network — KYC verified",
    escrow: "EscrowPi — neutral automated escrow layer",
    chatbot: "M.A.C. (Map of Pi AI Companion)",
  },

  community: {
    structure: "Volunteer built, global marketing team",
    regions: ["Africa", "China", "UK", "Japan", "North America", "India", "South Korea", "Middle East"],
    countryChampions: true,
    socialTags: ["#mapofpi", "#pinetwork", "#picommerce", "#picommunity", "#buildinpublic"],
  },

  messaging: {
    core: "Real people. Real reviews. Real Pi commerce.",
    utility: "Making Pi more than just a mined token — a currency for everyday commerce.",
    trust: "Trust built into Pi eCommerce.",
    growth: "Volunteer built. Pioneer powered. Ecosystem proven.",
    v2teaser: "Online shopping. Next-level utility. The evolution the community has been patiently awaiting.",
  },

  antcpuAffiliation: {
    status: "affiliate partner — use case 1",
    offer: "1 free month membership to ANTCPU ADS platform",
    goal: "Run a full 10-antbot campaign to demonstrate ANTCPU ADS capabilities",
  },
};

export const ADS_SYSTEM_PROMPT = `You are the ANTCPU ADS Agent — casual, sharp, knowledgeable marketing AI.
You specialize in building automated ad campaigns using a pod of 10 antbots.
Each antbot handles a specific channel independently. You monitor and report their status.

Current client: Map of Pi (mapofpi.com) — world's most used crypto global marketplace.
- 2.1M+ users, 148K sellers, 173K+ transactions
- Pi price $0.17, Market Cap $1.75B, CMC Rank #42
- Won 2024 Pi Commerce Hackathon
- v1.8 live and being used globally — v2 (online shopping) coming soon
- Volunteer built, KYC verified, free to use, no bank account needed
- EscrowPi for safe transactions, M.A.C. as their in-app chatbot
- Global team: Africa, China, UK, Japan, North America, India, South Korea, Middle East

Your tone: casual, confident, no hype. Smart friend who knows marketing cold.
When briefed on a campaign, dispatch antbots and report status per channel.
Generate ad copy, social posts, strategies, and channel briefs on demand.`;

export default MAPOFPI_KB;

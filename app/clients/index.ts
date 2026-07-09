// ============================================================
// clients/index.ts — Client Registry
// Add new clients here as they onboard
// ============================================================

export { default as mapofpi, MAPOFPI_KB, ADS_SYSTEM_PROMPT as MAPOFPI_PROMPT } from './mapofpi/kb';
export { MAPOFPI_ICONS, MAPOFPI_VIDEOS, MAPOFPI_PHASES, MAPOFPI_COUNTRIES } from './mapofpi/assets';
export type { ShopIcon, MapOfPiVideo, Phase, Country } from './mapofpi/assets';

// Future clients:
// export { default as clientname } from './clientname/kb';

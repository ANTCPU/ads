// ─── Platform Registry ────────────────────────────────────────────────────────
// Single export of all platforms in display order.
// Import PLATFORMS from here everywhere — never from individual files.

import { twitter }         from './twitter';
import { facebook }        from './facebook';
import { linkedin }        from './linkedin';
import { whatsapp }        from './whatsapp';
import { telegram }        from './telegram';
import { instagram }       from './instagram';
import { tiktok }          from './tiktok';
import { youtube }         from './youtube';
import { discordPlatform } from './discord';
import { Platform }        from '../socialShare';

export const PLATFORMS: Platform[] = [
  twitter,
  whatsapp,
  telegram,
  facebook,
  linkedin,
  instagram,
  tiktok,
  youtube,
  discordPlatform,
];

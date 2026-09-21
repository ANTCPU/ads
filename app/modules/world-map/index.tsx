'use client';
// app/modules/world-map/index.tsx
// ─── World Map Module ─────────────────────────────────────────────────────────
//
// Shows where active ads are in the world.
//
// MOBILE  (< 640px): ranked flag column — flag, country, ad count badge
// DESKTOP (≥ 640px): SVG world map with flag pins + count badges
//
// Data: GET /api/stats → allCountries[] { country, count, flag }
// No new endpoint — reuses existing 60s cached stats.
//
// Map: Natural Earth simplified SVG inline — zero dependencies.
// Pins: absolutely positioned over SVG via pre-computed lat/long → % coords.
// Hover: tooltip showing country + count.
//
// v1 (Sep 2026) — new module
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { ModuleContext }        from '../types';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:      '#0a0a0a',
  card:    '#111',
  border:  '#1a1a1a',
  border2: '#222',
  orange:  '#f0883e',
  gold:    '#D4AF37',
  silver:  '#aaa',
  bronze:  '#cd7f32',
  green:   '#22c55e',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
  sub:     '#888',
};

// ─── Country coordinate table ─────────────────────────────────────────────────
// Natural Earth projection — 1000×500 viewBox
// x = ((lng + 180) / 360) * 100  (percentage of width)
// y = ((90 - lat) / 180) * 100   (percentage of height)
// Adjusted slightly for label readability on the simplified SVG

const COORDS: Record<string, { x: number; y: number }> = {
  // Africa
  'Nigeria':              { x: 51.5,  y: 55.0  },
  'Ghana':                { x: 49.5,  y: 56.5  },
  'Kenya':                { x: 57.5,  y: 58.5  },
  'South Africa':         { x: 54.5,  y: 72.0  },
  'Ethiopia':             { x: 57.5,  y: 54.5  },
  'Tanzania':             { x: 57.0,  y: 62.0  },
  'Uganda':               { x: 56.5,  y: 57.5  },
  'Cameroon':             { x: 52.5,  y: 56.0  },
  'Senegal':              { x: 46.5,  y: 54.0  },
  'Ivory Coast':          { x: 48.5,  y: 57.0  },
  'Zimbabwe':             { x: 55.5,  y: 67.5  },
  'Zambia':               { x: 55.0,  y: 64.5  },
  'Rwanda':               { x: 56.0,  y: 60.5  },
  'Morocco':              { x: 48.0,  y: 43.5  },
  'Algeria':              { x: 50.5,  y: 44.5  },
  'Tunisia':              { x: 51.5,  y: 42.5  },
  'Egypt':                { x: 55.5,  y: 45.5  },
  'Mozambique':           { x: 57.5,  y: 66.5  },
  'DR Congo':             { x: 54.0,  y: 60.5  },
  'Togo':                 { x: 50.0,  y: 56.5  },
  'Benin':                { x: 50.5,  y: 55.5  },
  'Sierra Leone':         { x: 47.0,  y: 57.0  },
  'Liberia':              { x: 47.5,  y: 57.5  },
  'Mali':                 { x: 49.0,  y: 51.5  },
  'Burkina Faso':         { x: 49.5,  y: 53.5  },
  'Niger':                { x: 51.5,  y: 51.5  },
  'Chad':                 { x: 53.5,  y: 51.5  },
  'Sudan':                { x: 56.0,  y: 50.5  },
  'Somalia':              { x: 59.5,  y: 55.5  },
  'Angola':               { x: 53.0,  y: 64.5  },
  'Namibia':              { x: 52.5,  y: 69.5  },
  'Botswana':             { x: 54.5,  y: 69.0  },
  // Middle East
  'Saudi Arabia':         { x: 59.0,  y: 48.5  },
  'UAE':                  { x: 61.5,  y: 49.5  },
  'Israel':               { x: 56.5,  y: 44.5  },
  'Jordan':               { x: 57.0,  y: 45.5  },
  'Lebanon':              { x: 56.5,  y: 43.5  },
  'Iraq':                 { x: 58.5,  y: 44.5  },
  'Iran':                 { x: 61.0,  y: 44.0  },
  'Kuwait':               { x: 59.5,  y: 46.5  },
  // Asia
  'India':                { x: 66.5,  y: 50.5  },
  'Pakistan':             { x: 64.0,  y: 46.5  },
  'Bangladesh':           { x: 68.5,  y: 50.0  },
  'Sri Lanka':            { x: 67.0,  y: 55.5  },
  'Nepal':                { x: 67.5,  y: 47.5  },
  'China':                { x: 73.0,  y: 42.0  },
  'Japan':                { x: 80.5,  y: 40.5  },
  'South Korea':          { x: 79.5,  y: 41.5  },
  'Hong Kong':            { x: 76.5,  y: 49.5  },
  'Taiwan':               { x: 77.5,  y: 48.5  },
  'Singapore':            { x: 73.5,  y: 57.5  },
  'Malaysia':             { x: 73.0,  y: 55.5  },
  'Indonesia':            { x: 75.5,  y: 58.5  },
  'Philippines':          { x: 78.5,  y: 52.5  },
  'Vietnam':              { x: 75.5,  y: 52.0  },
  'Thailand':             { x: 73.5,  y: 52.5  },
  'Myanmar':              { x: 71.5,  y: 50.5  },
  'Cambodia':             { x: 74.5,  y: 53.5  },
  'Laos':                 { x: 73.5,  y: 51.0  },
  // Oceania
  'Australia':            { x: 79.0,  y: 68.5  },
  'New Zealand':          { x: 84.5,  y: 75.5  },
  // Europe
  'United Kingdom':       { x: 47.5,  y: 33.5  },
  'Germany':              { x: 51.0,  y: 33.0  },
  'France':               { x: 49.0,  y: 34.5  },
  'Spain':                { x: 47.5,  y: 37.0  },
  'Italy':                { x: 52.0,  y: 37.0  },
  'Netherlands':          { x: 50.5,  y: 32.0  },
  'Portugal':             { x: 46.5,  y: 37.5  },
  'Greece':               { x: 54.0,  y: 38.5  },
  'Sweden':               { x: 52.5,  y: 27.5  },
  'Norway':               { x: 51.0,  y: 26.5  },
  'Denmark':              { x: 51.5,  y: 30.0  },
  'Finland':              { x: 54.0,  y: 26.5  },
  'Switzerland':          { x: 50.5,  y: 34.5  },
  'Austria':              { x: 52.0,  y: 34.0  },
  'Belgium':              { x: 50.0,  y: 33.0  },
  'Poland':               { x: 53.5,  y: 31.5  },
  'Czech Republic':       { x: 52.5,  y: 32.5  },
  'Hungary':              { x: 53.5,  y: 33.5  },
  'Romania':              { x: 55.0,  y: 33.5  },
  'Bulgaria':             { x: 54.5,  y: 35.5  },
  'Serbia':               { x: 53.5,  y: 35.0  },
  'Croatia':              { x: 52.5,  y: 35.5  },
  'Slovakia':             { x: 53.0,  y: 32.5  },
  'Turkey':               { x: 56.5,  y: 38.0  },
  'Ukraine':              { x: 55.5,  y: 31.0  },
  'Russia':               { x: 63.0,  y: 26.0  },
  // Americas
  'United States':        { x: 22.0,  y: 40.0  },
  'Canada':               { x: 22.0,  y: 30.0  },
  'Mexico':               { x: 19.0,  y: 48.5  },
  'Brazil':               { x: 33.0,  y: 63.5  },
  'Argentina':            { x: 30.0,  y: 73.5  },
  'Colombia':             { x: 27.5,  y: 57.5  },
  'Venezuela':            { x: 29.5,  y: 54.5  },
  'Peru':                 { x: 26.5,  y: 63.0  },
  'Chile':                { x: 27.5,  y: 70.5  },
  'Ecuador':              { x: 25.5,  y: 59.5  },
  'Bolivia':              { x: 28.5,  y: 65.5  },
  'Honduras':             { x: 21.5,  y: 52.5  },
  'Guatemala':            { x: 20.0,  y: 52.0  },
  'El Salvador':          { x: 20.5,  y: 53.5  },
  'Costa Rica':           { x: 22.0,  y: 54.5  },
  'Dominican Republic':   { x: 27.0,  y: 50.5  },
  'Cuba':                 { x: 24.5,  y: 49.5  },
  'Jamaica':              { x: 25.5,  y: 51.5  },
};

// ─── Simplified world SVG path ────────────────────────────────────────────────
// Natural Earth projection, simplified to ~200 points per continent.
// viewBox: 0 0 1000 500
// This is a stylised outline — not country-level detail, continent-level shapes.

const WORLD_PATH = `
M 95,142 L 98,138 L 104,135 L 112,133 L 118,130 L 125,128 L 132,127
L 140,126 L 148,127 L 155,129 L 160,133 L 163,138 L 162,144 L 158,149
L 152,153 L 145,155 L 138,155 L 131,153 L 125,150 L 119,146 L 113,143
L 107,142 L 101,142 L 95,142 Z
M 148,127 L 155,122 L 163,118 L 172,115 L 182,113 L 192,112 L 202,112
L 212,113 L 221,116 L 229,120 L 235,125 L 239,131 L 241,138 L 240,145
L 236,151 L 230,156 L 222,159 L 214,161 L 205,161 L 196,160 L 188,157
L 181,153 L 175,148 L 170,143 L 165,138 L 163,138 L 160,133 L 155,129
L 148,127 Z
M 241,138 L 248,133 L 256,129 L 265,126 L 275,124 L 285,123 L 295,123
L 305,124 L 314,127 L 322,131 L 328,136 L 332,142 L 333,149 L 331,156
L 326,162 L 319,167 L 311,170 L 302,172 L 293,172 L 284,170 L 276,167
L 269,162 L 263,156 L 258,150 L 254,144 L 241,138 Z
M 333,149 L 340,144 L 348,140 L 357,137 L 367,135 L 377,134 L 387,134
L 397,136 L 406,139 L 414,143 L 420,149 L 424,155 L 425,162 L 423,169
L 418,175 L 411,180 L 403,183 L 394,185 L 385,185 L 376,183 L 368,180
L 361,175 L 355,169 L 350,163 L 346,156 L 333,149 Z
M 425,162 L 432,157 L 440,153 L 449,150 L 459,148 L 469,148 L 479,149
L 488,152 L 496,156 L 502,162 L 506,168 L 507,175 L 505,182 L 500,188
L 493,193 L 485,196 L 476,198 L 467,198 L 458,196 L 450,192 L 443,187
L 437,181 L 433,174 L 425,162 Z
M 507,175 L 514,170 L 522,166 L 531,163 L 541,161 L 551,161 L 561,162
L 570,165 L 578,169 L 584,175 L 587,181 L 587,188 L 584,195 L 578,201
L 571,205 L 563,208 L 554,209 L 545,208 L 537,205 L 530,201 L 524,195
L 519,189 L 507,175 Z
M 587,188 L 594,183 L 602,179 L 611,176 L 621,174 L 631,174 L 641,175
L 650,178 L 658,182 L 664,188 L 667,194 L 667,201 L 664,208 L 658,214
L 651,218 L 643,221 L 634,222 L 625,221 L 617,218 L 610,214 L 604,208
L 599,202 L 587,188 Z
M 667,201 L 674,196 L 682,192 L 691,189 L 701,187 L 711,187 L 721,188
L 730,191 L 738,195 L 744,201 L 747,207 L 747,214 L 744,221 L 738,227
L 731,231 L 723,234 L 714,235 L 705,234 L 697,231 L 690,227 L 684,221
L 679,215 L 667,201 Z
M 747,214 L 754,209 L 762,205 L 771,202 L 781,200 L 791,200 L 801,201
L 810,204 L 818,208 L 824,214 L 827,220 L 827,227 L 824,234 L 818,240
L 811,244 L 803,247 L 794,248 L 785,247 L 777,244 L 770,240 L 764,234
L 759,228 L 747,214 Z
M 827,227 L 834,222 L 842,218 L 851,215 L 861,213 L 871,213 L 881,214
L 890,217 L 898,221 L 904,227 L 907,233 L 907,240 L 904,247 L 898,253
L 891,257 L 883,260 L 874,261 L 865,260 L 857,257 L 850,253 L 844,247
L 839,241 L 827,227 Z
M 100,200 L 108,196 L 117,193 L 127,191 L 137,190 L 147,191 L 156,193
L 164,197 L 170,203 L 173,210 L 172,217 L 168,224 L 161,229 L 153,233
L 144,235 L 135,235 L 126,233 L 118,229 L 112,224 L 107,218 L 100,200 Z
M 173,210 L 181,205 L 190,201 L 200,199 L 210,198 L 220,199 L 229,201
L 237,205 L 243,211 L 246,218 L 245,225 L 241,232 L 234,237 L 226,241
L 217,243 L 208,243 L 199,241 L 191,237 L 185,232 L 180,226 L 173,210 Z
M 246,218 L 254,213 L 263,209 L 273,207 L 283,206 L 293,207 L 302,209
L 310,213 L 316,219 L 319,226 L 318,233 L 314,240 L 307,245 L 299,249
L 290,251 L 281,251 L 272,249 L 264,245 L 258,240 L 253,234 L 246,218 Z
M 319,226 L 327,221 L 336,217 L 346,215 L 356,214 L 366,215 L 375,217
L 383,221 L 389,227 L 392,234 L 391,241 L 387,248 L 380,253 L 372,257
L 363,259 L 354,259 L 345,257 L 337,253 L 331,248 L 326,242 L 319,226 Z
M 392,234 L 400,229 L 409,225 L 419,223 L 429,222 L 439,223 L 448,225
L 456,229 L 462,235 L 465,242 L 464,249 L 460,256 L 453,261 L 445,265
L 436,267 L 427,267 L 418,265 L 410,261 L 404,256 L 399,250 L 392,234 Z
M 465,242 L 473,237 L 482,233 L 492,231 L 502,230 L 512,231 L 521,233
L 529,237 L 535,243 L 538,250 L 537,257 L 533,264 L 526,269 L 518,273
L 509,275 L 500,275 L 491,273 L 483,269 L 477,264 L 472,258 L 465,242 Z
M 538,250 L 546,245 L 555,241 L 565,239 L 575,238 L 585,239 L 594,241
L 602,245 L 608,251 L 611,258 L 610,265 L 606,272 L 599,277 L 591,281
L 582,283 L 573,283 L 564,281 L 556,277 L 550,272 L 545,266 L 538,250 Z
M 611,258 L 619,253 L 628,249 L 638,247 L 648,246 L 658,247 L 667,249
L 675,253 L 681,259 L 684,266 L 683,273 L 679,280 L 672,285 L 664,289
L 655,291 L 646,291 L 637,289 L 629,285 L 623,280 L 618,274 L 611,258 Z
M 684,266 L 692,261 L 701,257 L 711,255 L 721,254 L 731,255 L 740,257
L 748,261 L 754,267 L 757,274 L 756,281 L 752,288 L 745,293 L 737,297
L 728,299 L 719,299 L 710,297 L 702,293 L 696,288 L 691,282 L 684,266 Z
M 757,274 L 765,269 L 774,265 L 784,263 L 794,262 L 804,263 L 813,265
L 821,269 L 827,275 L 830,282 L 829,289 L 825,296 L 818,301 L 810,305
L 801,307 L 792,307 L 783,305 L 775,301 L 769,296 L 764,290 L 757,274 Z
M 830,282 L 838,277 L 847,273 L 857,271 L 867,270 L 877,271 L 886,273
L 894,277 L 900,283 L 903,290 L 902,297 L 898,304 L 891,309 L 883,313
L 874,315 L 865,315 L 856,313 L 848,309 L 842,304 L 837,298 L 830,282 Z
M 150,290 L 158,285 L 167,281 L 177,279 L 187,278 L 197,279 L 206,281
L 214,285 L 220,291 L 223,298 L 222,305 L 218,312 L 211,317 L 203,321
L 194,323 L 185,323 L 176,321 L 168,317 L 162,312 L 157,306 L 150,290 Z
M 223,298 L 231,293 L 240,289 L 250,287 L 260,286 L 270,287 L 279,289
L 287,293 L 293,299 L 296,306 L 295,313 L 291,320 L 284,325 L 276,329
L 267,331 L 258,331 L 249,329 L 241,325 L 235,320 L 230,314 L 223,298 Z
M 296,306 L 304,301 L 313,297 L 323,295 L 333,294 L 343,295 L 352,297
L 360,301 L 366,307 L 369,314 L 368,321 L 364,328 L 357,333 L 349,337
L 340,339 L 331,339 L 322,337 L 314,333 L 308,328 L 303,322 L 296,306 Z
M 369,314 L 377,309 L 386,305 L 396,303 L 406,302 L 416,303 L 425,305
L 433,309 L 439,315 L 442,322 L 441,329 L 437,336 L 430,341 L 422,345
L 413,347 L 404,347 L 395,345 L 387,341 L 381,336 L 376,330 L 369,314 Z
M 442,322 L 450,317 L 459,313 L 469,311 L 479,310 L 489,311 L 498,313
L 506,317 L 512,323 L 515,330 L 514,337 L 510,344 L 503,349 L 495,353
L 486,355 L 477,355 L 468,353 L 460,349 L 454,344 L 449,338 L 442,322 Z
M 515,330 L 523,325 L 532,321 L 542,319 L 552,318 L 562,319 L 571,321
L 579,325 L 585,331 L 588,338 L 587,345 L 583,352 L 576,357 L 568,361
L 559,363 L 550,363 L 541,361 L 533,357 L 527,352 L 522,346 L 515,330 Z
M 588,338 L 596,333 L 605,329 L 615,327 L 625,326 L 635,327 L 644,329
L 652,333 L 658,339 L 661,346 L 660,353 L 656,360 L 649,365 L 641,369
L 632,371 L 623,371 L 614,369 L 606,365 L 600,360 L 595,354 L 588,338 Z
M 661,346 L 669,341 L 678,337 L 688,335 L 698,334 L 708,335 L 717,337
L 725,341 L 731,347 L 734,354 L 733,361 L 729,368 L 722,373 L 714,377
L 705,379 L 696,379 L 687,377 L 679,373 L 673,368 L 668,362 L 661,346 Z
M 734,354 L 742,349 L 751,345 L 761,343 L 771,342 L 781,343 L 790,345
L 798,349 L 804,355 L 807,362 L 806,369 L 802,376 L 795,381 L 787,385
L 778,387 L 769,387 L 760,385 L 752,381 L 746,376 L 741,370 L 734,354 Z
M 807,362 L 815,357 L 824,353 L 834,351 L 844,350 L 854,351 L 863,353
L 871,357 L 877,363 L 880,370 L 879,377 L 875,384 L 868,389 L 860,393
L 851,395 L 842,395 L 833,393 L 825,389 L 819,384 L 814,378 L 807,362 Z
M 200,370 L 208,365 L 217,361 L 227,359 L 237,358 L 247,359 L 256,361
L 264,365 L 270,371 L 273,378 L 272,385 L 268,392 L 261,397 L 253,401
L 244,403 L 235,403 L 226,401 L 218,397 L 212,392 L 207,386 L 200,370 Z
M 273,378 L 281,373 L 290,369 L 300,367 L 310,366 L 320,367 L 329,369
L 337,373 L 343,379 L 346,386 L 345,393 L 341,400 L 334,405 L 326,409
L 317,411 L 308,411 L 299,409 L 291,405 L 285,400 L 280,394 L 273,378 Z
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type CountryRow = {
  country: string;
  count:   number;
  flag:    string;
};

// ─── Medal helper ─────────────────────────────────────────────────────────────

function medal(i: number): string {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `${i + 1}`;
}

function medalColor(i: number): string {
  if (i === 0) return C.gold;
  if (i === 1) return C.silver;
  if (i === 2) return C.bronze;
  return C.muted;
}

// ─── Flag Column (mobile + list toggle) ──────────────────────────────────────

function FlagColumn({
  countries,
  total,
}: {
  countries: CountryRow[];
  total:     number;
}) {
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? countries : countries.slice(0, 8);
  const maxCount = countries[0]?.count || 1;

  return (
    <div>
      {/* Summary */}
      <div style={{
        display:       'flex',
        justifyContent:'space-between',
        fontSize:      '0.72rem',
        color:         C.muted,
        marginBottom:  '0.85rem',
      }}>
        <span>{total} ads across {countries.length} countries</span>
        <span style={{ color: C.orange, fontWeight: 700 }}>
          {countries[0]?.flag} {countries[0]?.country} leads
        </span>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {display.map((row, i) => (
          <div key={row.country} style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '0.65rem',
            padding:      '0.55rem 0.75rem',
            background:   i === 0 ? `${C.gold}08` : C.bg,
            border:       `1px solid ${i === 0 ? C.gold + '30' : C.border}`,
            borderRadius: '10px',
          }}>
            {/* Medal / rank */}
            <span style={{
              fontSize:   i < 3 ? '1.1rem' : '0.72rem',
              color:      medalColor(i),
              fontWeight: 700,
              width:      '24px',
              textAlign:  'center',
              flexShrink: 0,
            }}>
              {medal(i)}
            </span>

            {/* Flag */}
            <span style={{ fontSize: '1.4rem', flexShrink: 0, lineHeight: 1 }}>
              {row.flag}
            </span>

            {/* Country + bar */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize:   '0.85rem',
                fontWeight: i < 3 ? 700 : 400,
                color:      i < 3 ? C.text : C.sub,
                marginBottom: '0.2rem',
              }}>
                {row.country}
              </div>
              <div style={{ height: '3px', background: C.border, borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height:       '100%',
                  width:        `${(row.count / maxCount) * 100}%`,
                  background:   i === 0 ? C.gold : i === 1 ? C.silver : i === 2 ? C.bronze : C.orange,
                  borderRadius: '999px',
                  transition:   'width 0.4s ease',
                }} />
              </div>
            </div>

            {/* Count badge */}
            <span style={{
              fontSize:     '0.78rem',
              fontWeight:   700,
              color:        i < 3 ? medalColor(i) : C.muted,
              background:   C.card,
              border:       `1px solid ${C.border}`,
              borderRadius: '999px',
              padding:      '0.1rem 0.5rem',
              flexShrink:   0,
            }}>
              {row.count} {row.count === 1 ? 'ad' : 'ads'}
            </span>
          </div>
        ))}
      </div>

      {/* Show all toggle */}
      {countries.length > 8 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{
            marginTop:    '0.75rem',
            width:        '100%',
            background:   'transparent',
            border:       `1px solid ${C.border2}`,
            borderRadius: '8px',
            color:        C.muted,
            fontSize:     '0.75rem',
            padding:      '0.4rem',
            cursor:       'pointer',
          }}
        >
          {showAll
            ? 'Show less ▲'
            : `Show all ${countries.length} countries ▼`
          }
        </button>
      )}
    </div>
  );
}

// ─── SVG Pin Map (desktop) ────────────────────────────────────────────────────

function PinMap({
  countries,
  total,
}: {
  countries: CountryRow[];
  total:     number;
}) {
  const [tooltip, setTooltip] = useState<{ country: string; count: number; flag: string } | null>(null);
  const maxCount = countries[0]?.count || 1;

  // Build a lookup for quick access
  const countryMap: Record<string, CountryRow> = {};
  countries.forEach(c => { countryMap[c.country] = c; });

  return (
    <div style={{ position: 'relative', width: '100%' }}>

      {/* Map container */}
      <div style={{
        position:     'relative',
        width:        '100%',
        background:   '#0d0d0d',
        border:       `1px solid ${C.border}`,
        borderRadius: '12px',
        overflow:     'hidden',
        paddingBottom: '50%', // 2:1 aspect ratio
      }}>

        {/* SVG world outline */}
        <svg
          viewBox="0 0 1000 500"
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ocean background */}
          <rect width="1000" height="500" fill="#0d0d0d" />

          {/* Grid lines — subtle latitude/longitude */}
          {[20, 40, 60, 80].map(y => (
            <line key={`h${y}`} x1="0" y1={y * 5} x2="1000" y2={y * 5}
              stroke="#1a1a1a" strokeWidth="0.5" />
          ))}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => (
            <line key={`v${x}`} x1={x * 10} y1="0" x2={x * 10} y2="500"
              stroke="#1a1a1a" strokeWidth="0.5" />
          ))}

          {/* World landmass */}
          <path
            d={WORLD_PATH}
            fill="#1a1a1a"
            stroke="#2a2a2a"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />

          {/* Highlighted countries — glow fill for countries with ads */}
          {countries.map(row => {
            const coord = COORDS[row.country];
            if (!coord) return null;
            const intensity = Math.min((row.count / maxCount), 1);
            return (
              <circle
                key={`glow-${row.country}`}
                cx={coord.x * 10}
                cy={coord.y * 5}
                r={12 + intensity * 8}
                fill={C.orange}
                opacity={0.06 + intensity * 0.08}
              />
            );
          })}
        </svg>

        {/* Flag pins — absolutely positioned over SVG */}
        {countries.map((row, i) => {
          const coord = COORDS[row.country];
          if (!coord) return null;

          const isTop    = i === 0;
          const pinSize  = isTop ? '1.6rem' : '1.2rem';
          const badgeSize = isTop ? '0.65rem' : '0.55rem';

          return (
            <div
              key={row.country}
              onMouseEnter={() => setTooltip(row)}
              onMouseLeave={() => setTooltip(null)}
              style={{
                position:  'absolute',
                left:      `${coord.x}%`,
                top:       `${coord.y}%`,
                transform: 'translate(-50%, -100%)',
                cursor:    'pointer',
                zIndex:    isTop ? 10 : 5,
              }}
            >
              {/* Pin stem */}
              <div style={{
                width:        '2px',
                height:       isTop ? '10px' : '7px',
                background:   isTop ? C.orange : C.muted,
                margin:       '0 auto',
                borderRadius: '0 0 2px 2px',
              }} />

              {/* Flag bubble */}
              <div style={{
                position:     'relative',
                background:   isTop ? `${C.orange}20` : `${C.card}cc`,
                border:       `1px solid ${isTop ? C.orange + '60' : C.border}`,
                borderRadius: '999px',
                padding:      isTop ? '0.2rem 0.35rem' : '0.15rem 0.25rem',
                display:      'flex',
                alignItems:   'center',
                gap:          '0.2rem',
                boxShadow:    isTop ? `0 0 8px ${C.orange}40` : 'none',
                backdropFilter: 'blur(4px)',
                whiteSpace:   'nowrap',
              }}>
                <span style={{ fontSize: pinSize, lineHeight: 1 }}>{row.flag}</span>

                {/* Count badge */}
                <span style={{
                  fontSize:     badgeSize,
                  fontWeight:   800,
                  color:        isTop ? C.orange : C.muted,
                  background:   C.bg,
                  border:       `1px solid ${isTop ? C.orange + '40' : C.border}`,
                  borderRadius: '999px',
                  padding:      '0.05rem 0.3rem',
                  lineHeight:   1.4,
                }}>
                  {row.count}
                </span>
              </div>
            </div>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position:     'absolute',
            bottom:       '0.75rem',
            left:         '50%',
            transform:    'translateX(-50%)',
            background:   '#000000cc',
            border:       `1px solid ${C.orange}40`,
            borderRadius: '8px',
            padding:      '0.4rem 0.85rem',
            fontSize:     '0.78rem',
            color:        C.text,
            fontWeight:   600,
            whiteSpace:   'nowrap',
            zIndex:       20,
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none',
          }}>
            {tooltip.flag} {tooltip.country} — {tooltip.count} {tooltip.count === 1 ? 'ad' : 'ads'}
          </div>
        )}

        {/* Map legend */}
        <div style={{
          position:  'absolute',
          top:       '0.5rem',
          right:     '0.75rem',
          fontSize:  '0.6rem',
          color:     C.dim,
          textAlign: 'right',
        }}>
          {countries.length} countries · {total} ads
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorldMapModule({ slug }: ModuleContext) {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState<'map' | 'list'>('map');

  // Detect mobile via window width — SSR safe
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        setCountries(data.allCountries || []);
        setTotal(data.totalAds        || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ color: C.muted, fontSize: '0.85rem' }}>Loading...</div>
  );

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (countries.length === 0) return (
    <div style={{ width: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text, marginBottom: '1rem' }}>
        🌍 World Map
      </div>
      <div style={{
        background:   C.bg,
        border:       `1px solid ${C.border}`,
        borderRadius: '12px',
        padding:      '1.5rem',
        textAlign:    'center',
        color:        C.muted,
        fontSize:     '0.85rem',
      }}>
        No country data yet — ads will appear here as the network grows.
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   '1.25rem',
        flexWrap:       'wrap',
        gap:            '0.5rem',
      }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text }}>
          🌍 World Map
        </div>

        {/* View toggle — desktop only */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {(['map', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  background:   view === v ? C.orange : 'transparent',
                  border:       `1px solid ${view === v ? C.orange : C.border2}`,
                  borderRadius: '6px',
                  color:        view === v ? '#000' : C.muted,
                  fontSize:     '0.72rem',
                  fontWeight:   view === v ? 700 : 400,
                  padding:      '0.25rem 0.65rem',
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                }}
              >
                {v === 'map' ? '🗺️ Map' : '📋 List'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile — always flag column */}
      {isMobile && (
        <FlagColumn countries={countries} total={total} />
      )}

      {/* Desktop — map or list */}
      {!isMobile && (
        <>
          {view === 'map' && (
            <>
              <PinMap countries={countries} total={total} />
              {/* Mini flag strip below map */}
              <div style={{
                display:   'flex',
                gap:       '0.5rem',
                flexWrap:  'wrap',
                marginTop: '0.85rem',
              }}>
                {countries.slice(0, 10).map((row, i) => (
                  <div key={row.country} style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '0.3rem',
                    background:   C.bg,
                    border:       `1px solid ${i === 0 ? C.gold + '40' : C.border}`,
                    borderRadius: '999px',
                    padding:      '0.2rem 0.6rem',
                    fontSize:     '0.72rem',
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>{row.flag}</span>
                    <span style={{ color: i === 0 ? C.gold : C.sub, fontWeight: i === 0 ? 700 : 400 }}>
                      {row.country}
                    </span>
                    <span style={{
                      color:        C.orange,
                      fontWeight:   700,
                      background:   `${C.orange}15`,
                      borderRadius: '999px',
                      padding:      '0 0.3rem',
                      fontSize:     '0.65rem',
                    }}>
                      {row.count}
                    </span>
                  </div>
                ))}
                {countries.length > 10 && (
                  <div style={{
                    display:      'flex',
                    alignItems:   'center',
                    background:   C.bg,
                    border:       `1px solid ${C.border}`,
                    borderRadius: '999px',
                    padding:      '0.2rem 0.6rem',
                    fontSize:     '0.72rem',
                    color:        C.muted,
                  }}>
                    +{countries.length - 10} more
                  </div>
                )}
              </div>
            </>
          )}

          {view === 'list' && (
            <FlagColumn countries={countries} total={total} />
          )}
        </>
      )}
    </div>
  );
}

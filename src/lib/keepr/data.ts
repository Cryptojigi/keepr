import type { Creator, CreatorRate, IncomeReceipt, KeeperEvent, Tier } from "./types";

export const TIERS: Tier[] = [
  {
    id: 0,
    name: "Basic",
    usd: 5,
    strk: 25,
    periodDays: 30,
    blurb: "A nameless pass. Enough to open the gate.",
    features: [
      "Paid from a shielded note",
      "Membership proof, no wallet scan",
      "Telegram / Discord gate",
      "30-day keeper renewal",
    ],
  },
  {
    id: 1,
    name: "Pro",
    usd: 20,
    strk: 100,
    periodDays: 30,
    blurb: "Quota for agents. Receipts for the books.",
    features: [
      "Everything in Basic",
      "Agent API execution quota",
      "Viewing-key income receipts",
      "Priority keeper slot",
    ],
  },
  {
    id: 2,
    name: "VIP",
    usd: 50,
    strk: 250,
    periodDays: 30,
    blurb: "Uncapped bandwidth. A custom STARK pass.",
    features: [
      "Everything in Pro",
      "Unrestricted inference",
      "Custom proof pass",
      "Direct creator channel",
    ],
  },
];

export const CREATOR_RATES: Record<string, CreatorRate[]> = {
  aegis: [
    { id: 0, name: "Watch", strk: 4 },
    { id: 1, name: "Desk", strk: 10 },
    { id: 2, name: "Floor", strk: 25 },
  ],
  cipher: [
    { id: 0, name: "Digest", strk: 3 },
    { id: 1, name: "Brief", strk: 8 },
    { id: 2, name: "Desk", strk: 15 },
  ],
  forge: [
    { id: 0, name: "Calls", strk: 5 },
    { id: 1, name: "Quota", strk: 12 },
    { id: 2, name: "Uncapped", strk: 30 },
  ],
  archive: [
    { id: 0, name: "Issue", strk: 3 },
    { id: 1, name: "Library", strk: 8 },
    { id: 2, name: "Patron", strk: 20 },
  ],
  vellum: [
    { id: 0, name: "Studio", strk: 2 },
    { id: 1, name: "Patron", strk: 10 },
    { id: 2, name: "Circle", strk: 20 },
  ],
};

export function cloneRates(): Record<string, CreatorRate[]> {
  return Object.fromEntries(
    Object.entries(CREATOR_RATES).map(([id, rows]) => [
      id,
      rows.map((r) => ({ ...r })),
    ]),
  );
}

export function ratesForCreator(
  creatorId: string,
  book?: Record<string, CreatorRate[]>,
): CreatorRate[] {
  return book?.[creatorId] ?? CREATOR_RATES[creatorId] ?? CREATOR_RATES.archive;
}

export function rateById(
  creatorId: string,
  tierId: number,
  book?: Record<string, CreatorRate[]>,
): CreatorRate {
  const rates = ratesForCreator(creatorId, book);
  return rates.find((r) => r.id === tierId) ?? rates[0];
}

export const CREATORS: Creator[] = [
  {
    id: "aegis",
    name: "Aegis",
    handle: "aegis.agent",
    category: "Risk agent",
    blurb:
      "Desk-grade liquidation watch. Runs on a session key. Never posts your book.",
    subscribers: 86,
    mrrStrk: 2150,
    address: "0x05b2b2b1a8d7c6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1",
  },
  {
    id: "cipher",
    name: "Cipher Brief",
    handle: "cipher.brief",
    category: "Intelligence",
    blurb:
      "A weekly private digest. Sources stay in the note. Names never leave the key.",
    subscribers: 214,
    mrrStrk: 4280,
    address: "0x02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  },
  {
    id: "forge",
    name: "Forge",
    handle: "forge.api",
    category: "Inference",
    blurb:
      "Metered model calls for other agents. Quota is a proof, not a key in a repo.",
    subscribers: 61,
    mrrStrk: 6100,
    address: "0x07f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d",
  },
  {
    id: "archive",
    name: "The Archive",
    handle: "the.archive",
    category: "Research",
    blurb:
      "Longform Starknet research. Paid issues, nameless membership, no scrapeable MRR.",
    subscribers: 143,
    mrrStrk: 3575,
    address: "0x04e1a91c7b3d8f2a6c90e5d4b1f8a7c3e2d9b0a6f4c8e1d7a3b5c9e0f2d4a6b8",
  },
  {
    id: "vellum",
    name: "Vellum",
    handle: "vellum",
    category: "Studio",
    blurb:
      "A writer’s private studio. Patrons pay from notes. The list is a viewing key.",
    subscribers: 97,
    mrrStrk: 1940,
    address: "0x01c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
  },
];

export const LOOP_ROWS: { cap: string; pay: string; sub: string; keepr: string }[] =
  [
    { cap: "Shielded payment", pay: "Yes", sub: "No", keepr: "Yes" },
    { cap: "Recurring charge", pay: "No", sub: "Yes", keepr: "Yes" },
    { cap: "Gasless keeper", pay: "No", sub: "No", keepr: "Yes" },
    { cap: "Viewing-key receipts", pay: "No", sub: "No", keepr: "Yes" },
    { cap: "STARK membership card", pay: "No", sub: "No", keepr: "Yes" },
  ];

const DEMO_NOW = Date.UTC(2026, 7, 25, 21, 40, 0);

export function keeperFeed(now = DEMO_NOW): KeeperEvent[] {
  const mins = [1, 6, 11, 18, 27, 41, 58];
  const rows: Omit<KeeperEvent, "at">[] = [
    {
      action: "renew",
      subId: "sub_0x3a91",
      detail: "25 STRK · cipher.brief · digest",
      status: "ok",
    },
    {
      action: "renew",
      subId: "sub_0x7c12",
      detail: "150 STRK · forge.api · quota",
      status: "ok",
    },
    {
      action: "skip",
      subId: "sub_0x91e0",
      detail: "note dry · 400 STRK needed",
      status: "hold",
    },
    {
      action: "renew",
      subId: "sub_0xb4d8",
      detail: "20 STRK · vellum · studio",
      status: "ok",
    },
    {
      action: "subscribe",
      subId: "sub_0x1f8c",
      detail: "100 STRK · the.archive · library",
      status: "ok",
    },
    {
      action: "cancel",
      subId: "sub_0xe22a",
      detail: "revoked · no fund movement",
      status: "ok",
    },
    {
      action: "renew",
      subId: "sub_0x55c7",
      detail: "300 STRK · aegis.agent · floor",
      status: "ok",
    },
  ];
  return rows.map((r, i) => ({
    ...r,
    at: now - (mins[i] ?? 90) * 60_000,
  }));
}

export const DEMO_RECEIPTS: IncomeReceipt[] = [
  {
    id: "rcpt_2026_08",
    period: "Aug 2026",
    amountStrk: 3575,
    channels: 143,
    createdAt: Date.UTC(2026, 7, 24, 6, 0, 0),
  },
  {
    id: "rcpt_2026_07",
    period: "Jul 2026",
    amountStrk: 3410,
    channels: 138,
    createdAt: Date.UTC(2026, 6, 24, 6, 0, 0),
  },
  {
    id: "rcpt_2026_06",
    period: "Jun 2026",
    amountStrk: 2980,
    channels: 121,
    createdAt: Date.UTC(2026, 5, 24, 6, 0, 0),
  },
  {
    id: "rcpt_2026_05",
    period: "May 2026",
    amountStrk: 2640,
    channels: 109,
    createdAt: Date.UTC(2026, 4, 24, 6, 0, 0),
  },
];

export const MRR_SERIES = [
  { m: "Mar", v: 1820 },
  { m: "Apr", v: 2105 },
  { m: "May", v: 2640 },
  { m: "Jun", v: 2980 },
  { m: "Jul", v: 3410 },
  { m: "Aug", v: 3575 },
];

export function creatorById(id: string): Creator | undefined {
  return CREATORS.find((c) => c.id === id);
}

export function tierById(id: number): Tier {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

export function usdFromStrk(strk: number): number {
  return Math.round(strk / 5);
}

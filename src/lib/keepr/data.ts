import type { Creator, CreatorRate, IncomeReceipt, KeeperEvent, Tier } from "./types";

export const TIERS: Tier[] = [
  {
    id: 0,
    name: "Basic",
    usd: 5,
    strk: 25,
    periodDays: 30,
    blurb: "Essential private pass for gated community and feed access.",
    features: [
      "Paid directly from a shielded balance",
      "Cryptographic proof of access without public address lookups",
      "Discord and Telegram community gate access",
      "Automated 30-day renewal handled by keepers",
    ],
  },
  {
    id: 1,
    name: "Pro",
    usd: 20,
    strk: 100,
    periodDays: 30,
    blurb: "High throughput quota for AI agents and professional readers.",
    features: [
      "All features included in Basic",
      "Dedicated API execution bandwidth",
      "Private income receipts with viewing keys",
      "Priority automated renewal slot",
    ],
  },
  {
    id: 2,
    name: "VIP",
    usd: 50,
    strk: 250,
    periodDays: 30,
    blurb: "Uncapped bandwidth with direct channel access and custom STARK pass.",
    features: [
      "All features included in Pro",
      "Unrestricted inference and query limits",
      "Custom zero-knowledge verification pass",
      "Direct creator communication channel",
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
    name: "Aegis Sentinel",
    handle: "aegis.agent",
    category: "Risk Agent",
    blurb:
      "Automated liquidation monitoring and on-chain risk telemetry. Subscriptions renew autonomously via session keys without revealing position sizes.",
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
      "Weekly private cryptographic research and market intelligence. Payments are settled privately and reader subscriber lists remain confidential.",
    subscribers: 214,
    mrrStrk: 4280,
    address: "0x02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  },
  {
    id: "archive",
    name: "The Archive",
    handle: "the.archive",
    category: "Deep Research",
    blurb:
      "Comprehensive Starknet engineering papers and protocol teardowns. Access is verified using zero-knowledge membership proofs.",
    subscribers: 143,
    mrrStrk: 3575,
    address: "0x04e1a91c7b3d8f2a6c90e5d4b1f8a7c3e2d9b0a6f4c8e1d7a3b5c9e0f2d4a6b8",
  },
  {
    id: "vellum",
    name: "Vellum Studio",
    handle: "vellum.studio",
    category: "Creative Studio",
    blurb:
      "Private editorial publishing and curated developer dispatches. Readers support work through shielded notes with viewing-key receipts.",
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

const BASE_NOW = Date.UTC(2026, 7, 25, 21, 40, 0);

export function keeperFeed(now = BASE_NOW): KeeperEvent[] {
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
      subId: "sub_0x8f12",
      detail: "10 STRK · aegis.agent · desk",
      status: "ok",
    },
    {
      action: "subscribe",
      subId: "sub_0x5c44",
      detail: "3575 STRK pool note · archive",
      status: "ok",
    },
    {
      action: "skip",
      subId: "sub_0x1b09",
      detail: "insufficient note (0 shielded) · vellum",
      status: "hold",
    },
    {
      action: "renew",
      subId: "sub_0x7d20",
      detail: "20 STRK · the.archive · patron",
      status: "ok",
    },
    {
      action: "renew",
      subId: "sub_0x4e66",
      detail: "4 STRK · aegis.agent · watch",
      status: "ok",
    },
    {
      action: "renew",
      subId: "sub_0x9a31",
      detail: "15 STRK · cipher.brief · desk",
      status: "ok",
    },
  ];

  return rows.map((r, i) => ({
    ...r,
    at: now - (mins[i] ?? (i + 1) * 7) * 60 * 1000,
  }));
}

export function creatorById(id: string): Creator | undefined {
  return CREATORS.find((c) => c.id === id);
}

export const DEMO_RECEIPTS: IncomeReceipt[] = [
  {
    id: "rcpt_9f1a",
    period: "August 2026",
    amountStrk: 3575,
    channels: 143,
    createdAt: Date.UTC(2026, 7, 24, 18, 12, 0),
  },
  {
    id: "rcpt_7c2b",
    period: "July 2026",
    amountStrk: 3100,
    channels: 124,
    createdAt: Date.UTC(2026, 6, 23, 11, 4, 0),
  },
  {
    id: "rcpt_4d8e",
    period: "June 2026",
    amountStrk: 2400,
    channels: 96,
    createdAt: Date.UTC(2026, 5, 21, 9, 30, 0),
  },
];

export const MRR_SERIES = [
  { m: "Apr", v: 1200 },
  { m: "May", v: 1850 },
  { m: "Jun", v: 2400 },
  { m: "Jul", v: 3100 },
  { m: "Aug", v: 3575 },
];

export function usdFromStrk(strk: number, price = 0.026): number {
  return Math.round(strk * price * 100) / 100;
}

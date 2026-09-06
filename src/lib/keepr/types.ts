export type TierId = 0 | 1 | 2;

export type CreatorRate = {
  id: TierId;
  name: string;
  strk: number;
};

export type Tier = {
  id: TierId;
  name: string;
  usd: number;
  strk: number;
  periodDays: number;
  blurb: string;
  features: string[];
};

export type PricingType = "flat" | "tiered";

export type Creator = {
  id: string;
  name: string;
  handle: string;
  category: string;
  blurb: string;
  subscribers: number;
  mrrStrk: number;
  address: string;
  ownerAddress?: string;
  discoverable?: boolean;
  serviceUrl?: string;
  archived?: boolean;
  isCustom?: boolean;
  isDemo?: boolean;
  createdAt?: number;
  pricingType?: PricingType;
};

export type Subscription = {
  id: string;
  creatorId: string;
  tier: TierId;
  amountStrk: number;
  startedAt: number;
  lastRenewedAt: number;
  nextRenewalAt: number;
  active: boolean;
  autoRenew: boolean;
  txHash: string;
  authSecret?: string;
  salt?: string;
  creatorAddress?: string;
  serviceUrl?: string;
};

export type KeeperEvent = {
  at: number;
  action: "renew" | "skip" | "cancel" | "subscribe";
  subId: string;
  detail: string;
  status: "ok" | "hold" | "fail";
};

export type IncomeReceipt = {
  id: string;
  period: string;
  amountStrk: number;
  channels: number;
  createdAt: number;
};

export type VendedItem = {
  id: string;
  creatorId: string;
  creatorAddress: string;
  title: string;
  description: string;
  category: string;
  priceStrk: number;
  deliveryUrl: string;
  active: boolean;
  salesCount?: number;
  createdAt: number;
};

export type PurchasedItem = {
  id: string;
  itemId: string;
  creatorId: string;
  title: string;
  amountStrk: number;
  purchasedAt: number;
  deliveryUrl: string;
  txHash: string;
  creatorAddress?: string;
};

export type FeeSplit = {
  grossAmount: number;
  creatorAmount: number;
  protocolFee: number;
  protocolFeeBps: number;
};


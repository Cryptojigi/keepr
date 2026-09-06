export const APP_NAME = "Keepr";

export const STRK_TOKEN =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

/** STRK20 privacy pool (mainnet). */
export const STRK20_POOL =
  "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";

/** Helper address on mainnet — KeeprSubscriptionHelper (deployed 2026-08-28). */
export const HELPER_MAINNET =
  "0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1";

export const DEMO_ADDRESS =
  "0x04e1a91c7b3d8f2a6c90e5d4b1f8a7c3e2d9b0a6f4c8e1d7a3b5c9e0f2d4a6b8";

export const DEMO_VIEWING_KEY = "vk_1f8c3a91e0b7d4c2";

export const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export const REPO_URL = "https://github.com/Cryptojigi/keepr";
export const STRK20_URL = "https://strk20.starknet.io";
export const RFP_URL = "https://strk20.starknet.io/rfp/private-subscriptions";
export const ETH_TOKEN =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export const READY_URL = "https://www.ready.co";
export const READY_STORE_URL =
  "https://chromewebstore.google.com/detail/ready-wallet/hkeaflfmepelbhgkhkbfmfbkkblhcfkn";

export const NETWORK_LABEL = "Starknet Mainnet";

/**
 * Keepr Protocol Fee Configuration
 * Mainnet v1 Policy: 0% protocol take-rate.
 * 100% of subscription tokens route directly into the creator's shielded payout note on Starknet.
 * (Protocol take-rates of 2.5% are scheduled for the upcoming v2 factory release).
 */
export const PROTOCOL_FEE_BPS = 0; // 0% on Mainnet v1

export const KEEPR_TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
  "0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1";

export function calculateFeeSplit(grossAmount: number, feeBps: number = PROTOCOL_FEE_BPS) {
  const fee = (grossAmount * feeBps) / 10000;
  const creatorAmount = Math.max(0, grossAmount - fee);
  return {
    grossAmount,
    creatorAmount: Math.round(creatorAmount * 100) / 100,
    protocolFee: Math.round(fee * 100) / 100,
    protocolFeeBps: feeBps,
  };
}

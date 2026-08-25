import { ProviderInterface, RpcProvider } from "starknet";

// ─── Example config — swap these for your own token / pool / helper ─────────

// DEMO VALUE: the ERC-20 this starter shields. Replace with the token your app
// moves privately (STRK on Starknet here).
export const addrSTRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

// Frontend RPC providers, indexed. The STRK20 privacy pool lives on Mainnet (0)
// and Sepolia (2); index 1 is a spare public testnet endpoint. NEXT_PUBLIC_PROVIDER_URL
// is your Alchemy key (see .env.example).
const rawKey = process.env.NEXT_PUBLIC_PROVIDER_URL || "";
export const alchemyKey = rawKey.includes("/") ? rawKey.split("/").pop() || "" : rawKey;

export const myFrontendProviders: ProviderInterface[] = [
    new RpcProvider({ nodeUrl: `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_10/${alchemyKey}` }),
    new RpcProvider({ nodeUrl: "https://starknet-testnet.public.blastapi.io/rpc/v0_7" }),
    new RpcProvider({ nodeUrl: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/${alchemyKey}` })
];

// ─── Keepr Default Subscription Tiers (Hardcoded 3 tiers for Hackathon) ──────
// NOTE: Tiers are currently standardized for the hackathon showcase.
// Full custom creator-configured tier pricing is supported in the protocol architecture.
export interface SubscriptionTier {
    id: number;
    name: string;
    tier: number; // 0, 1, 2
    usdPrice: number;
    tokenAmountStrk: string; // approximate or standard STRK amount (e.g., 25 STRK, 100 STRK, 250 STRK)
    periodDays: number;
    description: string;
    features: string[];
}

export const KEEPR_SUBSCRIPTION_TIERS: SubscriptionTier[] = [
    {
        id: 0,
        name: "Basic",
        tier: 0,
        usdPrice: 5,
        tokenAmountStrk: "25", // 25 STRK ($5 approx)
        periodDays: 30,
        description: "Essential private access & monthly newsletter",
        features: ["Shielded payments", "Nameless membership proof", "30-day auto-renewal", "Discord/Telegram gate access"]
    },
    {
        id: 1,
        name: "Pro",
        tier: 1,
        usdPrice: 20,
        tokenAmountStrk: "100", // 100 STRK ($20 approx)
        periodDays: 30,
        description: "Full private feed, premium agent inference & direct perks",
        features: ["All Basic features", "AI Agent API execution quota", "Viewing-key income receipt verification", "Priority keeper execution"]
    },
    {
        id: 2,
        name: "VIP",
        tier: 2,
        usdPrice: 50,
        tokenAmountStrk: "250", // 250 STRK ($50 approx)
        periodDays: 30,
        description: "Uncapped agent bandwidth, 1-on-1 private channels & custom proof passes",
        features: ["All Pro features", "Unrestricted agent inference", "Custom STARK proof pass", "Direct creator channel"]
    }
];


// ─── Example anonymizer (echo helper) ───────────────────────────────────────
// DEMO CONTRACT: StrkInvokeHelper (cairo/src/lib.cairo) just round-trips STRK
// through an open note to exercise the privacy_invoke flow end to end. Replace
// with your real anonymizer that performs an actual protocol action.

// DEMO VALUE: echo helper deployed on Mainnet.
export const Strk20EchoHelperAddress = "0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b";

// Echo helper on Sepolia — set NEXT_PUBLIC_STRK20_ECHO_HELPER_SEPOLIA to enable the
// Echo action there. "0x0" = not deployed (the action stays disabled). Deploy a fresh
// instance from the Echo tab, then paste the address into .env.local.
export const Strk20EchoHelperSepolia = process.env.NEXT_PUBLIC_STRK20_ECHO_HELPER_SEPOLIA ?? "0x0";

// Declared class hash of the echo helper (Mainnet + Sepolia). Deploying a fresh
// instance (no constructor args) needs only this class hash + a signed UDC deploy.
// See cairo/address.md.
export const Strk20EchoHelperClassHash = "0x2a4482a13cb7f70dce6f7ba99c4ee6ce404379abeddd9b831b6bf24eb71e137";

// Resolve the echo helper for a frontend provider index (0 = Mainnet, 2 = Sepolia).
// Returns "0x0" when no helper is deployed on that network.
export function echoHelperForIndex(index: number): string {
    if (index === 0) return Strk20EchoHelperAddress;
    if (index === 2) return Strk20EchoHelperSepolia;
    return "0x0";
}

// Frontend provider indices where the STRK20 privacy pool is available, mapped to a
// display name. Used to gate the WalletAccountV6 STRK20 actions.
export const Strk20Networks: Record<number, string> = { 0: "MAINNET", 2: "SEPOLIA" };

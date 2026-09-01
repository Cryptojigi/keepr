import { hash, num, RpcProvider, validateAndParseAddress } from "starknet";
import type { WALLET_API } from "@starknet-io/types-js";
import { HELPER_MAINNET, STRK_TOKEN } from "./constants";

export interface OnchainSubscriptionRecord {
  creator: string;
  tier: number;
  amount: bigint;
  period: number;
  lastRenewed: number;
  active: boolean;
  creatorNoteId: string;
  authCommit: string;
}

/**
 * Returns the active Starknet Mainnet RPC provider.
 */
export function getMainnetProvider(): RpcProvider {
  const rawKey = process.env.NEXT_PUBLIC_PROVIDER_URL || "";
  const alchemyKey = rawKey.includes("/") ? rawKey.split("/").pop() || "" : rawKey;
  const nodeUrl = rawKey.startsWith("http")
    ? rawKey
    : alchemyKey
      ? `https://starknet-mainnet.g.alchemy.com/v2/${alchemyKey}`
      : "https://free-rpc.nethermind.io/mainnet-juno";

  return new RpcProvider({ nodeUrl });
}

/**
 * Compute the deterministic, privacy-preserving sub_id = poseidon(wallet_address, salt).
 */
export function computeSubId(walletAddress: string, salt: string | bigint): string {
  try {
    const cleanAddr = validateAndParseAddress(walletAddress);
    const saltFelt = num.toHex(salt);
    return hash.computePoseidonHashOnElements([cleanAddr, saltFelt]);
  } catch {
    return hash.computePoseidonHashOnElements([walletAddress, num.toHex(salt)]);
  }
}

/**
 * Compute the cancel authorization commitment = poseidon(cancel_secret).
 */
export function computeAuthCommit(cancelSecret: string | bigint): string {
  const secretFelt = num.toHex(cancelSecret);
  return hash.computePoseidonHashOnElements([secretFelt]);
}

/**
 * Check whether an account is deployed on Starknet mainnet.
 * Returns false when the address has no contract (undeployed / not activated).
 */
export async function isAccountDeployed(address: string): Promise<boolean> {
  try {
    const provider = getMainnetProvider();
    await provider.getClassHashAt(address);
    return true;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("Contract not found") || msg.includes("ContractNotFound")) {
      return false;
    }
    console.warn("isAccountDeployed query failed:", err);
    return true; // unknown error — assume deployed, let the tx surface real issues
  }
}

/**
 * Refresh the user's live STRK balances (public + shielded) into the store.
 * Public = STRK token balanceOf; shielded = wallet's STRK20 pool balance.
 * Safe to call anytime; silently no-ops when no wallet is connected.
 */
export async function refreshLiveBalances(): Promise<void> {
  const { useKeepr } = await import("@/lib/keepr/store");
  const { myWalletAccount, address } =
    (await import("@/app/components/Wallet/walletContext")).useStoreWallet.getState();
  if (!myWalletAccount || !address) return;
  try {
    const entries: any[] = await myWalletAccount.strk20Balances([STRK_TOKEN]);
    const strkEntry = entries.find(
      (e: any) => (e?.token || e?.[0] || "").toLowerCase() === STRK_TOKEN.toLowerCase(),
    );
    const shieldedRaw = strkEntry ? (strkEntry.balance ?? strkEntry.amount ?? strkEntry[1]) : 0n;
    const shieldedStrk = Number(BigInt(shieldedRaw ?? 0n)) / 1e18;
    const balRes = await getMainnetProvider().callContract({
      contractAddress: STRK_TOKEN,
      entrypoint: "balanceOf",
      calldata: [address],
    });
    const low = BigInt(balRes[0]);
    const high = BigInt(balRes[1] ?? 0n);
    const publicStrk = Number((high << 128n) | low) / 1e18;
    useKeepr.setState({ publicStrk, shieldedStrk });
  } catch (err) {
    console.warn("refreshLiveBalances failed:", err);
  }
}

/**
 * Query is_active(sub_id) on the live KeeprSubscriptionHelper contract on Mainnet.
 */
export async function isActiveOnchain(subId: string): Promise<boolean> {
  if (!HELPER_MAINNET) return false;
  try {
    const provider = getMainnetProvider();
    const cleanSubId = num.toHex(subId);
    const res = await provider.callContract({
      contractAddress: HELPER_MAINNET,
      entrypoint: "is_active",
      calldata: [cleanSubId],
    });
    if (!res || res.length === 0) return false;
    return res[0] === "0x1" || BigInt(res[0]) === 1n;
  } catch (err) {
    console.warn("isActiveOnchain query failed:", err);
    return false;
  }
}

/**
 * Query get_subscription(sub_id) on the live KeeprSubscriptionHelper contract on Mainnet.
 */
export async function getSubscriptionOnchain(
  subId: string,
): Promise<OnchainSubscriptionRecord | null> {
  if (!HELPER_MAINNET) return null;
  try {
    const provider = getMainnetProvider();
    const cleanSubId = num.toHex(subId);
    const res = await provider.callContract({
      contractAddress: HELPER_MAINNET,
      entrypoint: "get_subscription",
      calldata: [cleanSubId],
    });

    // Format: [creator, tier, amount, period, last_renewed, active, creator_note_id, auth_commit]
    if (!res || res.length < 8) return null;

    const active = res[5] === "0x1" || BigInt(res[5]) === 1n;
    // If empty uninitialized record (creator = 0x0), return null
    if (BigInt(res[0]) === 0n && !active) {
      return null;
    }

    return {
      creator: res[0],
      tier: Number(BigInt(res[1])),
      amount: BigInt(res[2]),
      period: Number(BigInt(res[3])),
      lastRenewed: Number(BigInt(res[4])),
      active,
      creatorNoteId: res[6],
      authCommit: res[7],
    };
  } catch (err) {
    console.warn("getSubscriptionOnchain query failed:", err);
    return null;
  }
}

/**
 * Build the STRK20_ACTION array for a real Subscribe transaction through the Privacy Pool.
 *
 * Sequence:
 * 1. Withdraw amount to Helper contract
 * 2. Create OPEN note transfer for Creator
 * 3. Invoke KeeprSubscriptionHelper privacy_invoke(op=0, sub_id, creator, tier, amount, period, creator_note_id, auth_commit, 0)
 */
export function buildSubscribeActions(params: {
  creatorAddress: string;
  tierId: number;
  amountStrk: number;
  periodSeconds?: number;
  subId: string;
  authCommit: string;
}): WALLET_API.STRK20_ACTION[] {
  const {
    creatorAddress,
    tierId,
    amountStrk,
    periodSeconds = 30 * 24 * 60 * 60, // 30 days = 2592000s
    subId,
    authCommit,
  } = params;

  if (!HELPER_MAINNET) {
    throw new Error("Helper contract address not configured.");
  }

  const helper = num.toHex(HELPER_MAINNET);
  const token = num.toHex(STRK_TOKEN);
  const creator = num.toHex(creatorAddress);
  const amountWei = BigInt(amountStrk) * 10n ** 18n;
  const amountHex = num.toHex(amountWei);
  const periodHex = num.toHex(periodSeconds);
  const tierHex = num.toHex(tierId);
  const subIdHex = num.toHex(subId);
  const authCommitHex = num.toHex(authCommit);

  return [
    {
      type: "withdraw",
      token,
      amount: amountHex,
      recipient: helper,
    },
    {
      type: "transfer",
      token,
      amount: "OPEN",
      recipient: creator,
    },
    {
      type: "invoke",
      contract: helper,
      calldata: [
        token,
        "${poolAddress}",
        "0x0", // op = 0 (OP_SUBSCRIBE)
        subIdHex,
        creator,
        tierHex,
        amountHex,
        periodHex,
        "${openNoteIds[0]}",
        authCommitHex,
        "0x0", // auth_preimage = 0
      ],
    },
  ];
}

/**
 * Build the STRK20_ACTION array for a Cancel transaction through the Privacy Pool.
 *
 * Sequence:
 * 1. Invoke KeeprSubscriptionHelper privacy_invoke(op=2, sub_id, ..., auth_preimage)
 * No tokens required.
 */
export function buildCancelActions(params: {
  creatorAddress: string;
  tierId: number;
  subId: string;
  authPreimage: string;
}): WALLET_API.STRK20_ACTION[] {
  const { creatorAddress, tierId, subId, authPreimage } = params;

  if (!HELPER_MAINNET) {
    throw new Error("Helper contract address not configured.");
  }

  const helper = num.toHex(HELPER_MAINNET);
  const token = num.toHex(STRK_TOKEN);
  const creator = num.toHex(creatorAddress);
  const tierHex = num.toHex(tierId);
  const subIdHex = num.toHex(subId);
  const authPreimageHex = num.toHex(authPreimage);

  // NOTE: the wallet rejects an invoke-only action list ("invalid request payload"),
  // and it also rejects a zero-amount withdraw ("Withdraw amount must be positive").
  // So we lead with a 1-wei withdraw to the helper: positive enough to pass wallet
  // validation, but effectively zero money (1 wei ≈ 1e-18 STRK). The helper's cancel
  // path ignores the helper's balance and returns empty deposits, so nothing real moves.
  return [
    {
      type: "withdraw",
      token,
      amount: "0x1",
      recipient: helper,
    },
    {
      type: "invoke",
      contract: helper,
      calldata: [
        token,
        "${poolAddress}",
        "0x2", // op = 2 (OP_CANCEL)
        subIdHex,
        creator,
        tierHex,
        "0x0",
        "0x0",
        "0x0",
        "0x0",
        authPreimageHex,
      ],
    },
  ];
}

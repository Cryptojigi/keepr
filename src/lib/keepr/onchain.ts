import { hash, num, RpcProvider, validateAndParseAddress } from "starknet";
import type { WALLET_API } from "@starknet-io/types-js";
import { ETH_TOKEN, HELPER_MAINNET, STRK_TOKEN } from "./constants";

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
 * Returns the active Starknet Mainnet RPC provider with high-reliability fallback nodes.
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
 * Query standard ERC-20 token balance via RPC (returns human-readable token count).
 */
export async function queryErc20Balance(
  tokenAddress: string,
  accountAddress: string,
): Promise<number> {
  if (!accountAddress) return 0;
  try {
    const provider = getMainnetProvider();
    const cleanAccount = validateAndParseAddress(accountAddress);
    const res = await provider.callContract({
      contractAddress: tokenAddress,
      entrypoint: "balanceOf",
      calldata: [cleanAccount],
    });
    if (!res || res.length === 0) return 0;
    const low = BigInt(res[0]);
    const high = BigInt(res[1] ?? 0n);
    const totalWei = (high << 128n) | low;
    return Number(totalWei) / 1e18;
  } catch (e) {
    console.warn(`queryErc20Balance failed for ${tokenAddress}:`, e);
    return 0;
  }
}

/**
 * Query the STRK20 Privacy Pool shielded balance from Ready Wallet.
 * Requests [STRK_TOKEN, ETH_TOKEN] so all tokens are authorized cleanly in a single prompt.
 */
export async function queryShieldedStrk20Balance(walletAccount: any): Promise<number> {
  if (!walletAccount || typeof walletAccount.strk20Balances !== "function") {
    return 0;
  }
  try {
    const entries: any = await walletAccount.strk20Balances([STRK_TOKEN, ETH_TOKEN]);
    if (!entries) return 0;

    let rawAmount: bigint | string | number | null = null;

    if (Array.isArray(entries)) {
      const strkEntry = entries.find((e: any) => {
        if (typeof e === "string") return false;
        const tok = (e?.token || e?.tokenAddress || e?.[0] || "").toLowerCase();
        return (
          tok === STRK_TOKEN.toLowerCase() ||
          tok.includes(STRK_TOKEN.slice(2, 10).toLowerCase())
        );
      }) ?? entries[0];

      if (strkEntry) {
        rawAmount =
          strkEntry.balance ??
          strkEntry.amount ??
          strkEntry.shieldedAmount ??
          strkEntry[1] ??
          0n;
      }
    } else if (typeof entries === "object") {
      const cleanStrk = STRK_TOKEN.toLowerCase();
      for (const [key, val] of Object.entries(entries)) {
        if (key.toLowerCase() === cleanStrk || key.toLowerCase().includes("strk")) {
          rawAmount =
            (val as any)?.balance ?? (val as any)?.amount ?? (val as any) ?? 0n;
          break;
        }
      }
    }

    if (rawAmount !== null && rawAmount !== undefined) {
      const wei = BigInt(
        typeof rawAmount === "string" && rawAmount.startsWith("0x")
          ? rawAmount
          : String(rawAmount || 0),
      );
      return Number(wei) / 1e18;
    }
    return 0;
  } catch (err) {
    console.warn("queryShieldedStrk20Balance notice:", err);
    return 0;
  }
}

/**
 * Refresh the user's live STRK balances (public, shielded, and ETH) into the store.
 * - Public STRK and ETH are queried directly via RPC (completely silent, no extension popup).
 * - Shielded STRK is ONLY queried when fetchShielded is true (connect, post-transaction, manual Sync).
 *   This avoids repetitive 'Share private balances' security dialog prompts from Ready X.
 */
export async function refreshLiveBalances(options: { fetchShielded?: boolean } = {}): Promise<void> {
  const { fetchShielded = false } = options;
  const { useKeepr } = await import("@/lib/keepr/store");
  const { myWalletAccount, address, isConnected } =
    (await import("@/app/components/Wallet/walletContext")).useStoreWallet.getState();

  const currentAddress = address || useKeepr.getState().address;
  if (!currentAddress || (!isConnected && !useKeepr.getState().connected)) {
    return;
  }

  useKeepr.setState({ isSyncingBalances: true });

  try {
    // 1. Fetch transparent balances concurrently via Starknet RPC (no popup)
    const [publicStrk, ethBalance] = await Promise.all([
      queryErc20Balance(STRK_TOKEN, currentAddress),
      queryErc20Balance(ETH_TOKEN, currentAddress),
    ]);

    // 2. Fetch shielded STRK balance from Ready Wallet only when requested
    let shieldedStrk = useKeepr.getState().shieldedStrk;
    if (fetchShielded && myWalletAccount && isConnected) {
      try {
        shieldedStrk = await queryShieldedStrk20Balance(myWalletAccount);
      } catch (err) {
        console.warn("Shielded balance fetch skipped:", err);
      }
    }

    // 3. Update store atomically
    useKeepr.setState({
      address: currentAddress,
      publicStrk: Math.round(publicStrk * 100) / 100,
      shieldedStrk: Math.round(shieldedStrk * 100) / 100,
      ethBalance: Math.round(ethBalance * 10000) / 10000,
      lastBalanceSync: Date.now(),
      isSyncingBalances: false,
    });
  } catch (err) {
    console.warn("refreshLiveBalances error:", err);
    useKeepr.setState({ isSyncingBalances: false });
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
  // So we lead with a 1-wei withdraw to the CONNECTED ACCOUNT (recipient = creator
  // here resolves to the connected payout address). This satisfies wallet validation,
  // returns the 1 wei to the user (net zero), and — crucially — leaves the helper
  // with ZERO balance so the pool's dust-sweep has nothing to pull (a helper balance
  // it can't approve would revert the whole tx).
  return [
    {
      type: "withdraw",
      token,
      amount: "0x1",
      recipient: creator,
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

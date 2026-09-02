/**
 * Comprehensive Starknet and Ready Wallet error parser and formatter.
 * Translates cryptic RPC, wallet, and Cairo errors into human-friendly explanations.
 */

export interface ParsedError {
  message: string;
  detail?: string;
  isUserRejection?: boolean;
}

export function parseStarknetError(err: any): ParsedError {
  if (!err) {
    return { message: "An unknown error occurred. Please try again." };
  }

  const raw = typeof err === "string" ? err : err?.message || err?.error || String(err);

  // 1. User rejection or abort
  if (
    raw.includes("User abort") ||
    raw.includes("User rejected") ||
    raw.includes("User denied") ||
    raw.includes("cancelled") ||
    raw.includes("canceled") ||
    raw.includes("4001") ||
    raw.includes("rejected the request")
  ) {
    return {
      message: "Request cancelled",
      detail: "Transaction or balance request was rejected in Ready X.",
      isUserRejection: true,
    };
  }

  // 2. STRK20 Privacy Pool registration required
  if (raw.includes("NOT_REGISTERED") || raw.includes("not registered") || raw.includes("UNREGISTERED")) {
    return {
      message: "STRK20 Registration Required",
      detail: "Open Ready X and perform one initial 'Shield' operation inside the wallet to initialize your privacy keys.",
    };
  }

  // 3. Undeployed / Inactive Starknet Account
  if (
    raw.includes("ContractNotFound") ||
    raw.includes("Contract not found") ||
    raw.includes("Class hash not found") ||
    raw.includes("account not deployed")
  ) {
    return {
      message: "Account Not Activated",
      detail: "Your Ready X wallet needs activation on Starknet Mainnet. Deposit a small amount of STRK to activate it.",
    };
  }

  // 4. Insufficient Funds / Balance
  if (
    raw.includes("insufficient") ||
    raw.includes("Insufficient") ||
    raw.includes("exceeds balance") ||
    raw.includes("Not enough")
  ) {
    return {
      message: "Insufficient Balance",
      detail: "Your balance is insufficient to complete this transaction and network gas fees.",
    };
  }

  // 5. Keepr Contract Custom Errors (Cairo felt panics)
  if (raw.includes("ALREADY_ACTIVE")) {
    return {
      message: "Channel Already Active",
      detail: "You already have an active subscription channel for this creator.",
    };
  }

  if (raw.includes("PERIOD_NOT_ELAPSED")) {
    return {
      message: "Renewal Period Not Due",
      detail: "This subscription is still active and has not reached its renewal window yet.",
    };
  }

  if (raw.includes("AMOUNT_MISMATCH")) {
    return {
      message: "Amount Mismatch",
      detail: "The payment amount does not match the creator's configured tier price.",
    };
  }

  if (raw.includes("NO_INPUT") || raw.includes("INVALID_AMOUNT")) {
    return {
      message: "Invalid Note Deposit",
      detail: "No shielded note balance was detected for this payment transfer.",
    };
  }

  if (raw.includes("UNAUTHORIZED")) {
    return {
      message: "Unauthorized Cancellation",
      detail: "The cancel secret provided does not match the on-chain authorization commitment.",
    };
  }

  if (raw.includes("SUB_NOT_ACTIVE")) {
    return {
      message: "Channel Inactive",
      detail: "This subscription channel is closed or expired.",
    };
  }

  // 6. Network / RPC Failures
  if (raw.includes("Rate limit") || raw.includes("429") || raw.includes("fetch failed") || raw.includes("NetworkError")) {
    return {
      message: "Network Congestion",
      detail: "Starknet RPC node is busy. Please wait a few seconds and retry.",
    };
  }

  // 7. Non-STRK20 Wallet Error
  if (raw.includes("wallet_strk20InvokeTransaction") || raw.includes("Unknown request type")) {
    return {
      message: "Ready X Wallet Required",
      detail: "This action requires Ready X for zero-knowledge shielded note operations on Starknet.",
    };
  }

  // Generic fallback with cleaned message
  const cleaned = raw.replace(/^Error:\s*/, "").slice(0, 180);
  return {
    message: "Transaction Error",
    detail: cleaned,
  };
}

import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import { KeeprDaemon } from "./keeper";
import type { KeeperConfig } from "./types";

const rawRpc = process.env.STARKNET_RPC || process.env.NEXT_PUBLIC_PROVIDER_URL;
if (!rawRpc) {
  throw new Error(
    "Missing RPC endpoint. Please set STARKNET_RPC or NEXT_PUBLIC_PROVIDER_URL in your environment.",
  );
}

const rpcUrl = rawRpc.startsWith("http")
  ? rawRpc
  : `https://starknet-mainnet.g.alchemy.com/v2/${rawRpc.split("/").pop()}`;

const config: KeeperConfig = {
  rpcUrl,
  helperAddress:
    process.env.HELPER_ADDRESS ||
    "0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1",
  poolAddress:
    process.env.POOL_ADDRESS ||
    "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 15_000,
  dryRun: true, // Safety: Dry run by default
  maxRenewAmountStrk: 500, // 500 STRK safety limit
  minPeriodSeconds: 3600, // 1 hour min period safety
};

async function main() {
  console.log("┌────────────────────────────────────────────────────────┐");
  console.log("│         KEEPR AUTONOMOUS RENEWAL DAEMON (P2)           │");
  console.log("│   Zero-Knowledge Recurring Subscriptions on Starknet   │");
  console.log("└────────────────────────────────────────────────────────┘");

  const daemon = new KeeprDaemon(config);

  // If user passes specific sub_id as argument: `npx ts-node src/index.ts 0x123...`
  const cliArgs = process.argv.slice(2);
  for (const arg of cliArgs) {
    if (arg.startsWith("0x")) {
      daemon.registerSub(arg);
    }
  }

  // Handle graceful exit
  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT. Shutting down keeper cleanly…");
    daemon.stop();
    process.exit(0);
  });

  daemon.start();
}

void main();

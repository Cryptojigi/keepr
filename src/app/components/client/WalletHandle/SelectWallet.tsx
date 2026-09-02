"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  walletV6,
  validateAndParseAddress,
  constants as SNconstants,
  WalletAccountV6,
} from "starknet";
import { WALLET_API } from "@starknet-io/types-js";
import { createStore, type Store } from "@starknet-io/get-starknet-discovery";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { myFrontendProviders } from "@/utils/constants";
import { useKeepr } from "@/lib/keepr/store";
import { READY_STORE_URL } from "@/lib/keepr/constants";
import { refreshLiveBalances } from "@/lib/keepr/onchain";
import { parseStarknetError } from "@/lib/keepr/errors";
import { formatStrk } from "@/lib/keepr/format";
import { useStoreWallet } from "../../Wallet/walletContext";
import { useFrontendProvider } from "../provider/providerContext";

function normalizeId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function SelectWallet({
  variant = "ctaBig",
  externalOpen,
  onExternalOpenChange,
}: {
  variant?: "nav" | "ctaBig" | "gate";
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}) {
  const setMyWallet = useStoreWallet((state) => state.setMyStarknetWalletObject);
  const setMyWalletAccount = useStoreWallet((state) => state.setMyWalletAccount);
  const { setCurrentFrontendProviderIndex } = useFrontendProvider((state) => state);

  const isConnected = useStoreWallet((state) => state.isConnected);
  const setConnected = useStoreWallet((state) => state.setConnected);
  const address = useStoreWallet((state) => state.address);
  const setAddressAccount = useStoreWallet((state) => state.setAddressAccount);
  const setWalletApi = useStoreWallet((state) => state.setWalletApiList);
  const setChain = useStoreWallet((state) => state.setChain);

  // Keepr live balance & demo store
  const demoConnected = useKeepr((s) => s.connected);
  const demoAddress = useKeepr((s) => s.address);
  const connectDemo = useKeepr((s) => s.connectDemo);
  const disconnectKeepr = useKeepr((s) => s.disconnect);
  const publicStrk = useKeepr((s) => s.publicStrk);
  const shieldedStrk = useKeepr((s) => s.shieldedStrk);
  const isSyncingBalances = useKeepr((s) => s.isSyncingBalances);

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>("");
  const [internalPickerOpen, setInternalPickerOpen] = useState(false);
  const [wallets, setWallets] = useState<WalletWithStarknetFeatures[]>([]);

  const pickerOpen = externalOpen !== undefined ? externalOpen : internalPickerOpen;
  const setPickerOpen = (open: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(open);
    } else {
      setInternalPickerOpen(open);
    }
  };

  useEffect(() => {
    const store: Store = createStore({ eip1193Adapters: [] });
    setWallets(store.getWallets().slice());
    const unsub = store.subscribe((next) => setWallets(next.slice()));
    return () => unsub();
  }, []);

  // Auto-reconnect on refresh
  useEffect(() => {
    if (typeof window === "undefined" || isConnected || wallets.length === 0) return;
    const lastWallet = localStorage.getItem("keepr_last_wallet");
    if (!lastWallet) return;

    const match = wallets.find(
      (w) => normalizeId(w.name).includes("ready") || normalizeId(w.name) === normalizeId(lastWallet),
    );
    if (match) {
      walletV6
        .getPermissions(match)
        .then(async (permissions: any) => {
          if (
            Array.isArray(permissions) &&
            permissions.includes(WALLET_API.Permission.ACCOUNTS)
          ) {
            await handleSelectedWallet(match, false);
          }
        })
        .catch(() => {});
    }
  }, [wallets, isConnected]);

  // Find Ready X in discovered wallets
  const readyWallet = wallets.find((w) => {
    const id = normalizeId(w.name);
    return id.includes("ready") || id.includes("readyx") || id.includes("readywallet");
  });

  async function handleSelectedWallet(selectedWallet: WalletWithStarknetFeatures, notify = true) {
    setMyWallet(selectedWallet);
    const myWA = await WalletAccountV6.connect(myFrontendProviders[0], selectedWallet);
    setMyWalletAccount(myWA);

    const result = await walletV6.requestAccounts(selectedWallet);
    if (typeof result === "string") {
      throw new Error("This wallet is not compatible with WalletAccountV6.");
    }

    let parsedAddr = "";
    if (Array.isArray(result) && result[0]) {
      parsedAddr = validateAndParseAddress(result[0]);
      setAddressAccount(parsedAddr);
      useKeepr.setState({ address: parsedAddr, connected: true });
    }

    const isConnectedWallet: boolean = await walletV6
      .getPermissions(selectedWallet)
      .then((res: any) =>
        (res as WALLET_API.Permission[]).includes(WALLET_API.Permission.ACCOUNTS),
      );

    setConnected(isConnectedWallet);
    if (isConnectedWallet) {
      if (typeof window !== "undefined") {
        localStorage.setItem("keepr_last_wallet", selectedWallet.name);
      }
      const chainId = (await walletV6.requestChainId(selectedWallet)) as string;
      setChain(chainId);
      setCurrentFrontendProviderIndex(
        chainId === SNconstants.StarknetChainId.SN_MAIN ? 0 : 2,
      );
      if (notify) {
        toast.success(`Ready X connected`);
      }

      // Query initial shielded & public balances once upon connection
      setTimeout(() => {
        void refreshLiveBalances({ fetchShielded: true });
      }, 200);
    }
    setWalletApi(await walletV6.supportedSpecs(selectedWallet));
  }

  async function connectReadyWallet() {
    if (!readyWallet) {
      toast.error("Ready X extension not detected.");
      return;
    }
    setError("");
    setConnecting(true);
    try {
      await handleSelectedWallet(readyWallet, true);
      setPickerOpen(false);
    } catch (err: any) {
      const parsed = parseStarknetError(err);
      if (!parsed.isUserRejection) {
        setError(parsed.detail || parsed.message);
        toast.error(parsed.message, { description: parsed.detail });
      }
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("keepr_last_wallet");
    }
    setConnected(false);
    setAddressAccount("");
    setMyWalletAccount(null as any);
    setMyWallet(null as any);
    disconnectKeepr();
    toast("Wallet disconnected.");
  }

  function handleEnterDemo() {
    connectDemo();
    setPickerOpen(false);
    toast.info("Demo mode active · 400 Public · 30 Shielded STRK");
  }

  const effectiveAddress = address || (demoConnected ? demoAddress : "");
  const effectiveConnected = isConnected || demoConnected;
  const shortAddr = effectiveAddress
    ? `${effectiveAddress.slice(0, 6)}…${effectiveAddress.slice(-4)}`
    : "";

  // Minimal, clean Ready X Wallet Modal
  const pickerModal = pickerOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
      onClick={() => !connecting && setPickerOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm border border-line bg-cream p-5 sm:p-6 shadow-[var(--shadow-border-hover)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-ink">
            Connect Wallet
          </h2>
          <button
            className="text-muted hover:text-ink transition-colors"
            onClick={() => setPickerOpen(false)}
            aria-label="Close"
            disabled={connecting}
          >
            <X className="size-5" />
          </button>
        </div>

        {error ? (
          <div className="mt-3 flex items-start gap-2 border border-accent/40 bg-accent-muted p-2.5 font-mono text-xs text-accent">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Ready X Primary Action */}
        <div className="mt-4 flex flex-col gap-2.5">
          {readyWallet ? (
            <button
              type="button"
              onClick={connectReadyWallet}
              disabled={connecting}
              className="flex items-center justify-between border-2 border-accent bg-raised p-3.5 text-left shadow-[var(--shadow-border)] hover:bg-cream transition-all disabled:opacity-60 group"
            >
              <div className="flex items-center gap-3">
                {readyWallet.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={readyWallet.icon}
                    alt="Ready X"
                    className="size-8 rounded-sm object-contain bg-cream p-0.5 border border-line"
                  />
                ) : (
                  <div className="size-8 bg-accent text-cream flex items-center justify-center font-display text-sm font-bold">
                    RX
                  </div>
                )}
                <div>
                  <p className="font-display text-base font-bold uppercase tracking-tight text-ink">
                    Ready X
                  </p>
                  <p className="font-mono text-[10px] text-accent uppercase tracking-wider">
                    Detected
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-semibold text-accent uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                {connecting ? "Connecting…" : "Connect →"}
              </span>
            </button>
          ) : (
            <a
              href={READY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between border border-line bg-raised p-3.5 text-left shadow-[var(--shadow-border)] hover:bg-cream transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 bg-ink/10 text-ink flex items-center justify-center font-display text-sm font-bold">
                  RX
                </div>
                <div>
                  <p className="font-display text-base font-bold uppercase tracking-tight text-ink">
                    Ready X
                  </p>
                  <p className="font-mono text-[10px] text-muted uppercase tracking-wider">
                    Not detected
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-muted group-hover:text-ink flex items-center gap-1">
                Install <ExternalLink className="size-3.5" />
              </span>
            </a>
          )}
        </div>

        {/* Discreet Demo Fallback */}
        <div className="mt-4 pt-3 border-t border-line text-center">
          <button
            type="button"
            onClick={handleEnterDemo}
            className="font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent transition-colors"
          >
            Enter Demo Mode
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Nav Variant
  if (variant === "nav") {
    if (effectiveConnected && shortAddr) {
      return (
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Live Balance Indicator */}
          <div className="hidden sm:flex items-center gap-2 border border-line bg-raised px-2.5 py-1.5 font-mono text-xs shadow-[var(--shadow-border)]">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase text-subtle">Shielded:</span>
              <span className="font-semibold text-accent">{formatStrk(shieldedStrk)}</span>
            </div>
            <span className="text-line">|</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase text-subtle">Pub:</span>
              <span className="text-ink">{formatStrk(publicStrk)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                void refreshLiveBalances({ fetchShielded: true });
                toast.info("Refreshing wallet balances…");
              }}
              className="ml-1 text-muted hover:text-ink transition-colors"
              title="Refresh balances"
            >
              <RefreshCw className={`size-3 ${isSyncingBalances ? "animate-spin text-accent" : ""}`} />
            </button>
          </div>

          {/* Connected Button */}
          <button
            type="button"
            onClick={handleDisconnect}
            className="flex h-10 sm:h-11 items-center gap-2 border border-line bg-cream px-2.5 sm:px-3 font-mono text-xs uppercase tracking-[0.12em] text-ink shadow-[var(--shadow-border)] hover:bg-accent-muted transition-colors"
            title="Ready X connected · Click to disconnect"
          >
            <span className="led led-ok" aria-hidden />
            <span>{shortAddr}</span>
          </button>
          {pickerModal}
        </div>
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={() => {
            setError("");
            setPickerOpen(true);
          }}
          className="flex h-10 sm:h-11 items-center gap-1.5 border border-accent bg-accent px-3.5 sm:px-4 font-mono text-xs font-medium uppercase tracking-[0.14em] text-cream shadow-[var(--shadow-border)] hover:bg-accent-hover transition-colors"
        >
          <ShieldCheck className="size-3.5 shrink-0" />
          <span>Connect</span>
        </button>
        {pickerModal}
      </>
    );
  }

  // Gate Variant
  if (variant === "gate") {
    return pickerModal;
  }

  // CTA Big Variant
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setPickerOpen(true);
        }}
        className="flex h-12 items-center justify-center gap-2 border border-accent bg-accent px-6 font-mono text-xs font-medium uppercase tracking-[0.16em] text-cream shadow-[var(--shadow-border)] hover:bg-accent-hover transition-colors"
      >
        <ShieldCheck className="size-4" />
        <span>{effectiveConnected ? `Connected · ${shortAddr}` : "Connect Ready X"}</span>
      </button>
      {pickerModal}
    </>
  );
}

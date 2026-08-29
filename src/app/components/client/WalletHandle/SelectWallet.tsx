"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
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
import { READY_URL } from "@/lib/keepr/constants";
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

  // Keepr Demo Store fallback
  const demoConnected = useKeepr((s) => s.connected);
  const demoAddress = useKeepr((s) => s.address);
  const connectDemo = useKeepr((s) => s.connectDemo);
  const disconnectKeepr = useKeepr((s) => s.disconnect);

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

  // Filter pickable wallets (exclude metamask spam and braavos)
  const pickable = wallets.filter((w) => {
    const id = normalizeId(w.name);
    return !id.includes("metamask") && !id.includes("braavos");
  });

  async function handleSelectedWallet(selectedWallet: WalletWithStarknetFeatures) {
    setMyWallet(selectedWallet);
    // Connect with Starknet Mainnet provider (index 0)
    const myWA = await WalletAccountV6.connect(myFrontendProviders[0], selectedWallet);
    setMyWalletAccount(myWA);

    const result = await walletV6.requestAccounts(selectedWallet);
    if (typeof result === "string") {
      throw new Error("This wallet is not compatible with WalletAccountV6.");
    }

    if (Array.isArray(result) && result[0]) {
      const addr = validateAndParseAddress(result[0]);
      setAddressAccount(addr);
    }

    const isConnectedWallet: boolean = await walletV6
      .getPermissions(selectedWallet)
      .then((res: any) =>
        (res as WALLET_API.Permission[]).includes(WALLET_API.Permission.ACCOUNTS),
      );

    setConnected(isConnectedWallet);
    if (isConnectedWallet) {
      const chainId = (await walletV6.requestChainId(selectedWallet)) as string;
      setChain(chainId);
      setCurrentFrontendProviderIndex(
        chainId === SNconstants.StarknetChainId.SN_MAIN ? 0 : 2,
      );
      toast.success("Ready wallet connected on Starknet Mainnet!");
    }
    setWalletApi(await walletV6.supportedSpecs(selectedWallet));
  }

  async function selectWallet(w: WalletWithStarknetFeatures) {
    setError("");
    setConnecting(true);
    try {
      await handleSelectedWallet(w);
      setPickerOpen(false);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setError(err?.message ?? "Wallet connection failed.");
      toast.error(err?.message ?? "Connection rejected.");
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
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
    toast.info("Demo vault open · 400 public · 30 shielded STRK");
  }

  const effectiveAddress = address || (demoConnected ? demoAddress : "");
  const effectiveConnected = isConnected || demoConnected;
  const shortAddr = effectiveAddress
    ? `${effectiveAddress.slice(0, 6)}…${effectiveAddress.slice(-4)}`
    : "";

  // The restyled Keepr Wallet Picker Modal
  const pickerModal = pickerOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-sm transition-opacity"
      onClick={() => !connecting && setPickerOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md border border-line bg-cream p-6 shadow-[var(--shadow-border-hover)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-muted hover:text-ink transition-colors"
          onClick={() => setPickerOpen(false)}
          aria-label="Close"
          disabled={connecting}
        >
          <X className="size-5" />
        </button>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            Starknet Vault
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-ink">
            Connect Wallet
          </h2>
          <p className="mt-2 font-mono text-xs text-muted leading-relaxed">
            Connect Ready or your Starknet wallet for shielded subscriptions and zero-knowledge gates on Mainnet.
          </p>
        </div>

        {error ? (
          <div className="mt-4 border border-accent/40 bg-accent-muted p-3 font-mono text-xs text-accent">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2.5">
          {pickable.length > 0 ? (
            pickable.map((w) => (
              <button
                key={w.name}
                type="button"
                onClick={() => selectWallet(w)}
                disabled={connecting}
                className="flex items-center justify-between border border-line bg-raised p-3.5 text-left shadow-[var(--shadow-border)] transition-all hover:bg-cream hover:border-line-hover disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  {w.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={w.icon}
                      alt=""
                      className="size-7 rounded-sm object-contain"
                    />
                  ) : (
                    <div className="size-7 bg-ink/10" />
                  )}
                  <div>
                    <p className="font-display text-base font-bold uppercase tracking-tight text-ink">
                      {w.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted uppercase tracking-wider">
                      {w.name.toLowerCase().includes("ready")
                        ? "STRK20 Privacy Enabled"
                        : "Starknet Standard"}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm text-accent">
                  {connecting ? "…" : "→"}
                </span>
              </button>
            ))
          ) : (
            <div className="border border-dashed border-line bg-raised/50 p-4 text-center">
              <p className="font-mono text-xs text-muted">
                No Starknet wallet extension detected.
              </p>
              <a
                href={READY_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-accent underline underline-offset-4"
              >
                Install Ready Wallet <ExternalLink className="size-3" />
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-subtle text-center mb-2">
            Fallback Demo Mode
          </p>
          <button
            type="button"
            onClick={handleEnterDemo}
            className="w-full border border-dashed border-line bg-base/80 py-2.5 px-3 text-center font-mono text-xs uppercase tracking-[0.14em] text-muted hover:border-accent hover:text-accent transition-colors"
          >
            Enter Demo Vault (400 STRK)
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Nav Variant (mounted in SiteHeader)
  if (variant === "nav") {
    if (effectiveConnected && shortAddr) {
      return (
        <>
          <button
            type="button"
            onClick={handleDisconnect}
            className="flex h-11 items-center gap-2 border border-line bg-cream px-3 font-mono text-xs uppercase tracking-[0.12em] text-ink shadow-[var(--shadow-border)] hover:bg-accent-muted transition-colors"
            title="Click to disconnect"
          >
            <span className="led led-ok" aria-hidden />
            <span>{shortAddr}</span>
            <span className="hidden text-[10px] text-muted lg:inline">
              ({isConnected ? "Ready" : "Demo"})
            </span>
          </button>
          {pickerModal}
        </>
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
          className="flex h-11 items-center border border-accent bg-accent px-4 font-mono text-xs font-medium uppercase tracking-[0.14em] text-cream shadow-[var(--shadow-border)] hover:bg-accent/90 transition-colors"
        >
          Connect
        </button>
        {pickerModal}
      </>
    );
  }

  // Gate Variant / CTA Big
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setPickerOpen(true);
        }}
        className="flex h-12 items-center justify-center border border-accent bg-accent px-6 font-mono text-xs font-medium uppercase tracking-[0.16em] text-cream shadow-[var(--shadow-border)] hover:bg-accent/90 transition-colors"
      >
        {effectiveConnected ? `Connected · ${shortAddr}` : "Connect Wallet"}
      </button>
      {pickerModal}
    </>
  );
}

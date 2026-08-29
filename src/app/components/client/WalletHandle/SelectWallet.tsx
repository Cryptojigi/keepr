"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Smartphone } from "lucide-react";
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

// Supported Starknet wallets for mobile guidance
// Note: WalletConnect integration scheduled for v2
const SUPPORTED_WALLETS = [
  {
    name: "Ready Wallet",
    idKey: "ready",
    url: "https://www.ready.co/",
    tag: "STRK20 Shielded",
  },
  {
    name: "Argent X",
    idKey: "argent",
    url: "https://www.argent.xyz/argent-x/",
    tag: "Mobile & Browser",
  },
  {
    name: "Braavos",
    idKey: "braavos",
    url: "https://braavos.app/",
    tag: "Hardware Signer",
  },
  {
    name: "OKX Wallet",
    idKey: "okx",
    url: "https://www.okx.com/web3",
    tag: "Multi-Chain",
  },
  {
    name: "Xverse",
    idKey: "xverse",
    url: "https://www.xverse.app/",
    tag: "Bitcoin & Starknet",
  },
];

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
  const [isMobile, setIsMobile] = useState(false);

  const pickerOpen = externalOpen !== undefined ? externalOpen : internalPickerOpen;
  const setPickerOpen = (open: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(open);
    } else {
      setInternalPickerOpen(open);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const store: Store = createStore({ eip1193Adapters: [] });
    setWallets(store.getWallets().slice());
    const unsub = store.subscribe((next) => setWallets(next.slice()));
    return () => unsub();
  }, []);

  // Auto-reconnect to last connected wallet on page refresh
  useEffect(() => {
    if (typeof window === "undefined" || isConnected || wallets.length === 0) return;
    const lastWallet = localStorage.getItem("keepr_last_wallet");
    if (!lastWallet) return;

    const match = wallets.find(
      (w) => normalizeId(w.name) === normalizeId(lastWallet),
    );
    if (match) {
      walletV6
        .getPermissions(match)
        .then(async (permissions: any) => {
          if (
            Array.isArray(permissions) &&
            permissions.includes(WALLET_API.Permission.ACCOUNTS)
          ) {
            await handleSelectedWallet(match);
          }
        })
        .catch((e) => console.log("Auto-reconnect skipped:", e));
    }
  }, [wallets, isConnected]);

  // Filter pickable wallets (exclude metamask snap probing and phantom Braavos adapter)
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
      if (typeof window !== "undefined") {
        localStorage.setItem("keepr_last_wallet", selectedWallet.name);
      }
      const chainId = (await walletV6.requestChainId(selectedWallet)) as string;
      setChain(chainId);
      setCurrentFrontendProviderIndex(
        chainId === SNconstants.StarknetChainId.SN_MAIN ? 0 : 2,
      );
      toast.success(`${selectedWallet.name} connected on Starknet Mainnet!`);
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
        className="relative w-full max-w-md border border-line bg-cream p-6 shadow-[var(--shadow-border-hover)] max-h-[90vh] overflow-y-auto"
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
        </div>

        {error ? (
          <div className="mt-4 border border-accent/40 bg-accent-muted p-3 font-mono text-xs text-accent">
            {error}
          </div>
        ) : null}

        {/* 1. All Starknet Wallets */}
        <div className="mt-6 flex flex-col gap-2.5">
          {SUPPORTED_WALLETS.map((sw) => {
            const detected = wallets.find((w) => {
              const name = normalizeId(w.name);
              return name.includes(sw.idKey) && !name.includes("metamask");
            });

            if (detected) {
              return (
                <button
                  key={sw.name}
                  type="button"
                  onClick={() => selectWallet(detected)}
                  disabled={connecting}
                  className="flex items-center justify-between border border-line bg-raised p-3.5 text-left shadow-[var(--shadow-border)] transition-all hover:bg-cream hover:border-line-hover disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    {detected.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={detected.icon}
                        alt=""
                        className="size-7 rounded-sm object-contain"
                      />
                    ) : (
                      <div className="size-7 bg-ink/10 flex items-center justify-center font-mono text-[10px] font-bold text-ink">
                        {sw.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-display text-base font-bold uppercase tracking-tight text-ink">
                        {sw.name}
                      </p>
                      <p className="font-mono text-[10px] text-accent uppercase tracking-wider">
                        Detected
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm text-accent">
                    {connecting ? "…" : "→"}
                  </span>
                </button>
              );
            }

            return (
              <a
                key={sw.name}
                href={sw.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between border border-line/60 bg-raised/50 p-3.5 text-left transition-all hover:bg-cream hover:border-line group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-7 bg-ink/5 flex items-center justify-center font-mono text-[10px] font-bold text-muted">
                    {sw.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-display text-base font-bold uppercase tracking-tight text-ink/80 group-hover:text-ink">
                      {sw.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted uppercase tracking-wider">
                      Not detected
                    </p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-muted group-hover:text-ink transition-colors" />
              </a>
            );
          })}
        </div>

        {/* 3. Fallback Demo Mode */}
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
              ({isConnected ? "Connected" : "Demo"})
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

  // Gate Variant (used exclusively by WalletModal dialog)
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
        className="flex h-12 items-center justify-center border border-accent bg-accent px-6 font-mono text-xs font-medium uppercase tracking-[0.16em] text-cream shadow-[var(--shadow-border)] hover:bg-accent/90 transition-colors"
      >
        {effectiveConnected ? `Connected · ${shortAddr}` : "Connect Wallet"}
      </button>
      {pickerModal}
    </>
  );
}

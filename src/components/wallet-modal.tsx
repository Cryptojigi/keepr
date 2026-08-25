"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { READY_URL } from "@/lib/keepr/constants";
import { useKeepr } from "@/lib/keepr/store";
import { Kicker } from "./kicker";

export function WalletModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const connectDemo = useKeepr((s) => s.connectDemo);
  const [trying, setTrying] = useState(false);

  function tryReady() {
    setTrying(true);
    window.setTimeout(() => setTrying(false), 700);
  }

  function enterDemo() {
    connectDemo();
    onOpenChange(false);
    toast("Demo vault open. 400 public · 30 shielded STRK.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Kicker>Vault</Kicker>
        <DialogTitle className="mt-3">Connect</DialogTitle>
        <DialogDescription>
          Ready is the privacy-enabled wallet for STRK20. This preview cannot
          reach a browser extension, so a demo vault walks the same loop.
        </DialogDescription>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={tryReady}
            disabled={trying}
          >
            <span>Ready wallet</span>
            <span className="text-subtle normal-case tracking-normal">
              {trying ? "not detected" : "mainnet"}
            </span>
          </Button>
          {trying ? (
            <p className="px-1 font-mono text-[11px] leading-relaxed text-muted">
              No Ready provider in this session.{" "}
              <a
                href={READY_URL}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline underline-offset-2"
              >
                Install Ready
              </a>{" "}
              for live shield / subscribe, or enter the demo vault.
            </p>
          ) : null}
          <Button className="w-full justify-between" onClick={enterDemo}>
            <span>Enter demo vault</span>
            <span className="text-cream/85 normal-case tracking-normal">
              0x04e1…a6b8
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

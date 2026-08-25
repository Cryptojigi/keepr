"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { WalletModal } from "@/components/wallet-modal";
import { Kicker } from "./kicker";

export function ConnectGate({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      <Kicker>Vault closed</Kicker>
      <h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink">
        {body}
      </p>
      <div className="mt-8 flex justify-center">
        <Button onClick={() => setOpen(true)}>Open vault</Button>
      </div>
      {children}
      <WalletModal open={open} onOpenChange={setOpen} />
    </section>
  );
}

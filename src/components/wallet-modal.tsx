"use client";

import SelectWallet from "@/app/components/client/WalletHandle/SelectWallet";

export function WalletModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <SelectWallet
      variant="gate"
      externalOpen={open}
      onExternalOpenChange={onOpenChange}
    />
  );
}

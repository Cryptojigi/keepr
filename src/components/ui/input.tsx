import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full bg-deep/50 px-3 font-mono text-sm text-ink tabular-nums placeholder:text-subtle shadow-[0_0_0_1px_var(--color-line)] transition-[box-shadow] duration-150 focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_var(--color-accent)] disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

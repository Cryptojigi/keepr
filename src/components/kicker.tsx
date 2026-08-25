import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kicker({
  index,
  children,
  className,
}: {
  index?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("kicker", className)}>
      {index ? (
        <>
          {index}
          <span className="mx-2 text-subtle">/</span>
        </>
      ) : null}
      {children}
    </p>
  );
}

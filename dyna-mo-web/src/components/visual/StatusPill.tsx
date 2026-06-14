import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatusPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/18 bg-primary/8 px-3 py-1 text-xs font-medium text-primary shadow-sm shadow-primary/5",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </span>
  );
}

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function GlowCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "data-sheen relative rounded-lg border border-border/70 bg-card/86 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10",
        "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/36 before:via-transparent before:to-primary/8 before:content-['']",
        className,
      )}
      {...props}
    >
      <div className="relative">{children}</div>
    </div>
  );
}

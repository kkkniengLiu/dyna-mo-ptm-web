import type { LucideIcon } from "lucide-react";

import { GlowCard } from "@/components/visual/GlowCard";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon?: LucideIcon;
  className?: string;
};

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  className,
}: KpiCardProps) {
  return (
    <GlowCard className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
        </div>
        {Icon ? (
          <div className="rounded-md border bg-background/70 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      {detail ? (
        <p className="mt-4 text-sm text-muted-foreground">{detail}</p>
      ) : null}
    </GlowCard>
  );
}

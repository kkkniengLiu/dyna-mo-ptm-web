import { formatNumber, slugLabel } from "@/lib/format";

type Count = {
  ptm_type: string;
  count: number;
  label?: string;
};

export function StatsBarChart({ counts }: { counts: Count[] }) {
  const max = Math.max(...counts.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {counts.map((item, index) => (
        <div
          key={item.ptm_type}
          className="rounded-md border bg-background/58 p-3 transition-colors hover:bg-background"
        >
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs text-primary">
                {index + 1}
              </span>
              <div className="min-w-0">
                <span className="font-medium">{item.ptm_type}</span>
                <span className="ml-2 text-muted-foreground">
                  {item.label ?? slugLabel(item.ptm_type)}
                </span>
              </div>
            </div>
            <span className="font-mono text-foreground">{item.count}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-700"
              style={{ width: `${(item.count / max) * 100}%` }}
              aria-label={`${item.ptm_type} ${formatNumber(item.count, 0)} systems`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

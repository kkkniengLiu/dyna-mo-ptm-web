"use client";

type TrajPlotProps = {
  title: string;
  yLabel: string;
  values: number[];
};

export function TrajPlot({ title, yLabel, values }: TrajPlotProps) {
  const path = toPolyline(values, 360, 120);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const gradientId = `plot-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-fill`;

  return (
    <div className="rounded-lg border bg-background/58 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{yLabel}</p>
        </div>
        <span className="rounded-md border bg-card px-2 py-1 font-mono text-xs text-primary">
          placeholder
        </span>
      </div>
      <div className="rounded-md border bg-card/70 p-3">
        <svg
          viewBox="0 0 360 120"
          role="img"
          aria-label={`${title} placeholder time series`}
          className="h-32 w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity="0.22"
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path
            d={`M0 120 L${path} L360 120 Z`}
            fill={`url(#${gradientId})`}
            opacity="0.9"
          />
          <polyline
            points={path}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="0" y1="119" x2="360" y2="119" stroke="hsl(var(--border))" />
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>min {Number.isFinite(min) ? min.toFixed(2) : "NA"}</span>
        <span>max {Number.isFinite(max) ? max.toFixed(2) : "NA"}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Placeholder until per-system RMSD/Rg/RMSF time-series CSV files are
        mounted.
      </p>
    </div>
  );
}

function toPolyline(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 16) - 8;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

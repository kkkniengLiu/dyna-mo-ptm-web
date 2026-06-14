import type { Metadata } from "next";
import { Database, Filter, Search } from "lucide-react";

import { SystemTable } from "@/components/SystemTable";
import { Card, CardContent } from "@/components/ui/card";
import { BackdropField } from "@/components/visual/BackdropField";
import { KpiCard } from "@/components/visual/KpiCard";
import { StatusPill } from "@/components/visual/StatusPill";
import { getSystems, hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Systems",
  description: "Search, filter, sort, and export Dyna-MO PTM systems.",
};

type BrowseSearchParams = {
  q?: string;
  ptm?: string;
  burial?: string;
  ss?: string;
};

export default function BrowsePage({
  searchParams,
}: {
  searchParams: BrowseSearchParams;
}) {
  const systems = getSystems();
  const ptmCount = new Set(systems.map((system) => system.ptm_type)).size;
  const meanResidues =
    systems.reduce((sum, system) => sum + (system.n_residues ?? 0), 0) /
    Math.max(systems.length, 1);

  return (
    <div className="relative overflow-hidden">
      <BackdropField className="opacity-60" />
      <div className="container relative py-8">
        <div className="mb-6 grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div className="space-y-3">
            <StatusPill>PASS systems · interactive table</StatusPill>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
                Browse all systems
              </h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Search UniProt, protein name, site, or PTM class; then preserve
                filters in the URL and export exactly the current view.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              icon={Database}
              label="Rows"
              value={systems.length.toLocaleString()}
              className="p-4"
            />
            <KpiCard
              icon={Filter}
              label="PTMs"
              value={ptmCount.toLocaleString()}
              className="p-4"
            />
            <KpiCard
              icon={Search}
              label="Mean residues"
              value={
                Number.isFinite(meanResidues) ? meanResidues.toFixed(0) : "NA"
              }
              className="p-4"
            />
          </div>
        </div>

        {!hasDatabase() ? (
          <Card className="border-dashed">
            <CardContent className="p-5 text-sm text-muted-foreground">
              No SQLite database found. Run{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                pnpm import:csv
              </code>{" "}
              before browsing the live dataset.
            </CardContent>
          </Card>
        ) : (
          <SystemTable
            systems={systems}
            initialQuery={searchParams.q ?? ""}
            initialPtm={splitParam(searchParams.ptm)}
            initialBurial={splitParam(searchParams.burial)}
            initialSiteSs={splitParam(searchParams.ss)}
          />
        )}
      </div>
    </div>
  );
}

function splitParam(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value.split(",").filter(Boolean);
}

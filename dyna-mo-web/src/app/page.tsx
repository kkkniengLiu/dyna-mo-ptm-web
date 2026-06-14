import {
  Activity,
  ArrowRight,
  Cpu,
  Database,
  Layers3,
  ShieldCheck,
  Timer,
} from "lucide-react";
import Link from "next/link";

import { StatsBarChart } from "@/components/StatsBarChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BackdropField } from "@/components/visual/BackdropField";
import { GlowCard } from "@/components/visual/GlowCard";
import { KpiCard } from "@/components/visual/KpiCard";
import { StatusPill } from "@/components/visual/StatusPill";
import { getStats, hasDatabase } from "@/lib/db";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const targetCounts = [
  { ptm_type: "acet_K", count: 284, label: "Lys acetylation" },
  { ptm_type: "methyl_K", count: 262, label: "Lys methylation" },
  { ptm_type: "methyl_R", count: 208, label: "Arg methylation" },
  { ptm_type: "phos_S", count: 47, label: "Ser phosphorylation" },
  { ptm_type: "phos_T", count: 39, label: "Thr phosphorylation" },
  { ptm_type: "phos_Y", count: 67, label: "Tyr phosphorylation" },
];

export default function Home() {
  const stats = getStats();
  const ptmCounts = stats.ptmCounts.length > 0 ? stats.ptmCounts : targetCounts;
  const totalSystems = stats.totalSystems || 907;
  const totalTrajectory = stats.totalTrajectoryMicroseconds || 29;

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden border-b">
        <BackdropField />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.88),hsl(var(--background))_74%)]" />
        <div className="container relative grid gap-8 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div className="space-y-7">
            <div className="flex flex-wrap gap-2">
              <StatusPill>NAR Database issue target</StatusPill>
              <StatusPill className="border-border bg-background/70 text-muted-foreground">
                paper v1 · 907 PASS systems
              </StatusPill>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-normal md:text-5xl">
                <span className="text-gradient">Dyna-MO PTM</span>
                <span>
                  : systematic MD for post-translationally modified proteins
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                A searchable molecular dynamics database that connects AF3
                confidence, replica consistency, site accessibility, rotamer
                state, and MD quality into one PTM-aware interface.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/browse">
                  Browse systems
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/download">Download data</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/api/v1/systems">API preview</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <PipelineStep
                icon={Database}
                label="AF3 structures"
                value="pLDDT in B-factor"
              />
              <PipelineStep
                icon={Activity}
                label="3 replicas"
                value="10 ns per rep"
              />
              <PipelineStep
                icon={ShieldCheck}
                label="QC metadata"
                value="PASS + full disclosure"
              />
            </div>
          </div>

          <GlowCard className="glass-panel hairline-glow p-5">
            <div className="mb-5 flex items-center justify-between gap-3 border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Live index</p>
                <h2 className="mt-1 text-xl font-semibold">
                  Dataset Composition
                </h2>
              </div>
              <span className="rounded-md border bg-background/70 px-2.5 py-1 font-mono text-xs text-primary">
                SQLite
              </span>
            </div>
            <StatsBarChart counts={ptmCounts} />
            <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
              <MiniStat label="Systems" value={totalSystems.toLocaleString()} />
              <MiniStat label="PTMs" value="6" />
              <MiniStat label="Rows" value="77 cols" />
            </div>
          </GlowCard>
        </div>
      </section>

      <section className="container py-10">
        {!hasDatabase() ? (
          <Card className="mb-8 border-dashed">
            <CardContent className="p-5 text-sm text-muted-foreground">
              SQLite database not found. Run{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                pnpm import:csv
              </code>{" "}
              to generate <code>data/dyna_mo.sqlite</code> from the master CSV.
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Database}
            label="Systems"
            value={totalSystems.toLocaleString()}
            detail="PASS metadata rows imported from master_table_all_pass.csv"
          />
          <KpiCard
            icon={Layers3}
            label="PTM types"
            value="6"
            detail="Acetyl, methyl and phospho classes"
          />
          <KpiCard
            icon={Timer}
            label="Indexed MD"
            value={`~${formatNumber(totalTrajectory, 1)} μs`}
            detail="Computed from trajectory totals in the current CSV"
          />
          <KpiCard
            icon={Cpu}
            label="Force field"
            value="CHARMM36"
            detail="CHARMM36-jul2022 + TIP3P at 310 K"
          />
        </div>
      </section>

      <section className="container grid gap-6 pb-12 lg:grid-cols-3" id="cite">
        <GlowCard className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-semibold">Research Scope</h2>
            <StatusPill className="hidden sm:inline-flex">
              metadata-first design
            </StatusPill>
          </div>
          <div className="grid gap-5 text-sm leading-7 text-muted-foreground md:grid-cols-2">
            <p>
              Each PASS system contains three 10 ns replicas with protein-level
              RMSD, Rg, RMSF, AF3 pLDDT, site burial, secondary structure,
              side-chain rotamer, and salt-bridge summaries.
            </p>
            <p>
              Trajectories stay as files and are served on demand. SQLite stores
              row-level metadata only, so future 947 or 1163 system releases can
              be swapped in by rerunning the importer.
            </p>
          </div>
        </GlowCard>
        <GlowCard className="p-5">
          <h2 className="text-xl font-semibold">Citation</h2>
          <pre className="mt-4 overflow-auto rounded-md border bg-background/70 p-3 text-xs text-muted-foreground">
            {`@article{dynamo_ptm_pending,
  title = {Dyna-MO PTM},
  journal = {Nucleic Acids Research},
  year = {pending},
  doi = {pending}
}`}
          </pre>
        </GlowCard>
      </section>
    </div>
  );
}

function PipelineStep({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background/66 p-3 shadow-sm backdrop-blur">
      <Icon className="mb-3 h-4 w-4 text-primary" />
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

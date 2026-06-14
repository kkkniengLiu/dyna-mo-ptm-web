import type { Metadata } from "next";
import { Activity, Database, ExternalLink, Gauge, Layers3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NGLViewer } from "@/components/NGLViewer";
import { TrajPlot } from "@/components/TrajPlot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackdropField } from "@/components/visual/BackdropField";
import { KpiCard } from "@/components/visual/KpiCard";
import { StatusPill } from "@/components/visual/StatusPill";
import { formatNumber } from "@/lib/format";
import { getSystem } from "@/lib/db";

export const dynamic = "force-dynamic";

type SystemPageProps = {
  params: {
    ptm: string;
    name: string;
  };
};

export function generateMetadata({ params }: SystemPageProps): Metadata {
  const ptm = decodeURIComponent(params.ptm);
  const name = decodeURIComponent(params.name);
  const system = getSystem(ptm, name);

  return {
    title: system ? `${system.protein_name} ${system.site}` : "System Detail",
    description: system
      ? `${system.ptm_type} system ${system.protein_name} at ${system.site}`
      : "Dyna-MO PTM system detail",
  };
}

export default function SystemDetailPage({ params }: SystemPageProps) {
  const ptm = decodeURIComponent(params.ptm);
  const name = decodeURIComponent(params.name);
  const system = getSystem(ptm, name);

  if (!system) {
    notFound();
  }

  const pdbUrl = `/pdbs/${system.ptm_type}/${system.protein_name}/raw.pdb`;

  return (
    <div className="relative overflow-hidden">
      <BackdropField className="opacity-55" />
      <div className="container relative py-8">
        <div className="glass-panel mb-6 rounded-lg border p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusPill>
                  <Link href="/browse" className="hover:underline">
                    Browse
                  </Link>
                </StatusPill>
                <StatusPill className="border-border bg-background/70 text-muted-foreground">
                  {system.ptm_type}
                </StatusPill>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
                {system.protein_name}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {system.uniprot_id.toUpperCase()} · {system.site} · {system.mod}
              </p>
            </div>
            <Button asChild variant="outline">
              <a
                href={`https://www.uniprot.org/uniprotkb/${system.uniprot_id.toUpperCase()}`}
                target="_blank"
                rel="noreferrer"
              >
                Open UniProt
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-4">
          <KpiCard icon={Database} label="PTM type" value={system.ptm_type} />
          <KpiCard
            icon={Layers3}
            label="Residues"
            value={formatNumber(system.n_residues, 0)}
          />
          <KpiCard
            icon={Gauge}
            label="Mean pLDDT"
            value={formatNumber(system.plddt_mean, 1)}
          />
          <KpiCard
            icon={Activity}
            label="Site pLDDT"
            value={formatNumber(system.site_plddt, 1)}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="glass-panel overflow-hidden">
            <CardHeader>
              <CardTitle>Starting Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <NGLViewer
                pdbUrl={pdbUrl}
                siteResid={system.site_resid ?? 1}
                siteResname={system.site_resname}
                sitePlddt={system.site_plddt ?? 0}
              />
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Site Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Detail label="Dominant SS" value={system.site_ss_dominant} />
                <Detail label="Burial" value={system.burial_class} />
                <Detail
                  label="Site SASA nm2"
                  value={formatNumber(system.sasa_site_mean_nm2, 3)}
                />
                <Detail
                  label="Salt bridges"
                  value={formatNumber(system.n_sb_contacts_mean, 2)}
                />
                <Detail
                  label="Chi1 rotamer"
                  value={system.chi1_dominant_rotamer}
                />
                <Detail
                  label="Chi2 rotamer"
                  value={system.chi2_dominant_rotamer}
                />
                <Detail
                  label="Distance to N-term"
                  value={formatNumber(system.dist_to_nterm, 0)}
                />
                <Detail
                  label="Distance to C-term"
                  value={formatNumber(system.dist_to_cterm, 0)}
                />
              </dl>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>MD Quality</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <TrajPlot
                title="RMSD(t)"
                yLabel="RMSD A"
                values={placeholderSeries(system.rmsd_equil_mean_A ?? 0)}
              />
              <TrajPlot
                title="Rg(t)"
                yLabel="Rg A"
                values={placeholderSeries(system.rg_mean_A ?? 0, 0.1)}
              />
              <TrajPlot
                title="Per-residue RMSF"
                yLabel="RMSF A"
                values={placeholderSeries(system.rmsf_mean_core_A ?? 0, 0.18)}
              />
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Replica Consistency</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail
                label="Inter-rep RMSD"
                value={formatNumber(system.rmsd_inter_mean, 2)}
              />
              <Detail label="1v2" value={formatNumber(system.rmsd_1v2, 2)} />
              <Detail label="1v3" value={formatNumber(system.rmsd_1v3, 2)} />
              <Detail label="2v3" value={formatNumber(system.rmsd_2v3, 2)} />
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Downloads</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <DownloadLink href={pdbUrl} label="starting.pdb" />
              <DownloadLink
                href={`/trajectories/${system.ptm_type}/${system.protein_name}/topology.tpr`}
                label="topology.tpr"
              />
              {[1, 2, 3].map((rep) => (
                <DownloadLink
                  key={rep}
                  href={`/trajectories/${system.ptm_type}/${system.protein_name}/rep${rep}/md.xtc`}
                  label={`rep${rep}/trajectory.xtc`}
                />
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 rounded-md border bg-background/56 px-2 py-1 font-medium">
        {value || "NA"}
      </dd>
    </div>
  );
}

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-md border bg-background/56 px-3 py-2 text-primary underline-offset-4 transition-colors hover:bg-muted hover:underline"
    >
      {label}
    </a>
  );
}

function placeholderSeries(center: number, spread = 0.25) {
  return Array.from({ length: 24 }, (_, index) => {
    const wave = Math.sin(index / 2.8) * spread;
    const drift = (index / 24) * spread * 0.6;
    return Number((center + wave + drift).toFixed(3));
  });
}

import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Download",
  description: "Bulk download links and CSV metadata for Dyna-MO PTM.",
};

const tarballs = [
  "acet_K",
  "methyl_K",
  "methyl_R",
  "phos_S",
  "phos_T",
  "phos_Y",
  "all",
];

export default function DownloadPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-semibold tracking-normal">Download</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Bulk tarballs will be mounted under <code>public/trajectories</code>.
        Current metadata CSV files are available from the data volume.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarballs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {tarballs.map((name) => (
              <a
                key={name}
                href={`/trajectories/tarballs/${name}.tar.gz`}
                className="rounded-md border px-3 py-2 text-primary underline-offset-4 hover:bg-muted hover:underline"
              >
                {name}.tar.gz
              </a>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <a
              className="rounded-md border px-3 py-2 text-primary underline-offset-4 hover:bg-muted hover:underline"
              href="/data/master_table_all_pass.csv"
            >
              master_table_all_pass.csv
            </a>
            <a
              className="rounded-md border px-3 py-2 text-primary underline-offset-4 hover:bg-muted hover:underline"
              href="/data/master_table_all.csv"
            >
              master_table_all.csv
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Methods",
  description: "Methods and data dictionary for Dyna-MO PTM.",
};

export default function AboutPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-semibold tracking-normal">
        Methods and Data Dictionary
      </h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Simulation Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>
              Force field: CHARMM36-jul2022. Water model: TIP3P. Temperature:
              310 K.
            </p>
            <p>
              Each PASS system uses AlphaFold3 starting structures and 10 ns x 3
              replica MD, with QC summaries stored in SQLite.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Dictionary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            The current Milestone 1 implementation validates all 77 master-table
            columns in <code>src/lib/schema.ts</code>. The full human-readable
            dictionary will be expanded in Milestone 2.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

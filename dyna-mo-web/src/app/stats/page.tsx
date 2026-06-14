import type { Metadata } from "next";

import { StatsBarChart } from "@/components/StatsBarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Database Statistics",
  description: "Interactive statistics dashboard for Dyna-MO PTM.",
};

export default function StatsPage() {
  const stats = getStats();

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-semibold tracking-normal">
        Database Statistics
      </h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Paper-style interactive figures are scheduled for Milestone 3. The
        current view exposes live PTM composition from SQLite.
      </p>
      <Card className="mt-6 max-w-3xl">
        <CardHeader>
          <CardTitle>PTM Composition</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsBarChart counts={stats.ptmCounts} />
        </CardContent>
      </Card>
    </div>
  );
}

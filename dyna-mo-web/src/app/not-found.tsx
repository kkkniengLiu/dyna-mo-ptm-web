import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-start justify-center gap-4">
      <h1 className="text-3xl font-semibold tracking-normal">
        System not found
      </h1>
      <p className="max-w-xl text-muted-foreground">
        The requested PTM system is not present in the current SQLite dataset.
      </p>
      <Button asChild>
        <Link href="/browse">Back to browse</Link>
      </Button>
    </div>
  );
}

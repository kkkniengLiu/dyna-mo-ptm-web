import Link from "next/link";

import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/download", label: "Download" },
  { href: "/about", label: "About" },
  { href: "/stats", label: "Stats" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/65 bg-background/78 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:-rotate-3">
            DM
          </span>
          <span className="tracking-normal">Dyna-MO PTM</span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border bg-card/70 p-1 shadow-sm md:flex">
          {navItems.map((item) => (
            <Button asChild variant="ghost" size="sm" key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/browse">Browse systems</Link>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

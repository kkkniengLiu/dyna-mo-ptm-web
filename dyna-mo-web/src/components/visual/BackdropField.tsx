import { cn } from "@/lib/utils";

export function BackdropField({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 bg-grid opacity-55 [mask-image:linear-gradient(180deg,black,transparent_78%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute left-[8%] top-12 h-48 w-px bg-gradient-to-b from-primary/45 to-transparent" />
      <div className="absolute right-[17%] top-24 h-60 w-px bg-gradient-to-b from-primary/25 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
    </div>
  );
}

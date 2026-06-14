"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type ColorMode = "plddt" | "secondary";

type NGLViewerProps = {
  pdbUrl: string;
  siteResid: number;
  siteResname: string;
  sitePlddt: number;
};

export function NGLViewer({
  pdbUrl,
  siteResid,
  siteResname,
  sitePlddt,
}: NGLViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<{ autoView: () => void } | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("plddt");
  const [status, setStatus] = useState("Loading structure viewer");
  const fallbackPdb = useMemo(
    () => buildFallbackPdb(siteResid, siteResname, sitePlddt),
    [sitePlddt, siteResid, siteResname],
  );

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function renderStructure() {
      const element = containerRef.current;
      if (!element) {
        return;
      }

      setStatus("Loading structure viewer");
      const ngl = await import("ngl");
      if (disposed) {
        return;
      }

      const stage = new ngl.Stage(element, {
        backgroundColor: "white",
      });
      stageRef.current = stage as unknown as { autoView: () => void };
      cleanup = () => stage.dispose();

      const source = await resolvePdbSource(pdbUrl, fallbackPdb);
      if (disposed) {
        return;
      }

      stage.removeAllComponents();
      const component = await stage.loadFile(source, { ext: "pdb" });
      const colorScheme = colorMode === "plddt" ? "bfactor" : "sstruc";
      component.addRepresentation("cartoon", {
        colorScheme,
        smoothSheet: true,
      });
      component.addRepresentation("licorice", {
        sele: `resno ${siteResid}`,
        color: "element",
        radius: 0.25,
      });
      component.addRepresentation("spacefill", {
        sele: `resno ${siteResid}`,
        color: "teal",
        radiusScale: 0.55,
      });
      component.autoView();
      setStatus(
        source instanceof Blob
          ? "Using generated placeholder PDB until raw.pdb is mounted"
          : "raw.pdb loaded",
      );

      const onResize = () => stage.handleResize();
      window.addEventListener("resize", onResize);
      cleanup = () => {
        window.removeEventListener("resize", onResize);
        stageRef.current = null;
        stage.dispose();
      };
    }

    renderStructure().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "NGL viewer failed");
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [colorMode, fallbackPdb, pdbUrl, siteResid]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") {
        stageRef.current?.autoView();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm text-muted-foreground">{status}</div>
          <div className="mt-1 text-xs text-slate-500">
            Drag to rotate, scroll to zoom; press R to reset view.
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={colorMode === "plddt" ? "default" : "outline"}
            size="sm"
            onClick={() => setColorMode("plddt")}
          >
            pLDDT coloring
          </Button>
          <Button
            type="button"
            variant={colorMode === "secondary" ? "default" : "outline"}
            size="sm"
            onClick={() => setColorMode("secondary")}
          >
            Secondary structure
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Reset view"
            title="Reset 3D view"
            onClick={() => stageRef.current?.autoView()}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative h-[420px] overflow-hidden rounded-lg border bg-white">
        {status === "Loading structure viewer" ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-fine-grid">
            <div className="rounded-lg border bg-white/88 p-5 text-center shadow-sm">
              <p className="font-medium text-slate-900">
                Preparing structure viewport
              </p>
              <p className="mt-1 text-sm text-slate-500">
                raw.pdb will render here when mounted
              </p>
            </div>
          </div>
        ) : null}
        <div
          ref={containerRef}
          className="h-full w-full"
          aria-label="NGL structure viewer"
        />
      </div>
    </div>
  );
}

async function resolvePdbSource(pdbUrl: string, fallbackPdb: string) {
  try {
    const response = await fetch(pdbUrl, { method: "HEAD" });
    if (response.ok) {
      return pdbUrl;
    }
  } catch {
    return new Blob([fallbackPdb], { type: "chemical/x-pdb" });
  }

  return new Blob([fallbackPdb], { type: "chemical/x-pdb" });
}

function buildFallbackPdb(
  siteResid: number,
  siteResname: string,
  sitePlddt: number,
) {
  const residue = siteResname.slice(0, 3).padEnd(3, " ").toUpperCase();
  const resno = String(siteResid).padStart(4, " ");
  const bfactor = sitePlddt.toFixed(2).padStart(6, " ");
  const atoms = [
    ["N", 0.0, 0.0, 0.0],
    ["CA", 1.5, 0.2, 0.0],
    ["C", 2.2, 1.4, 0.1],
    ["O", 1.7, 2.5, 0.2],
    ["CB", 2.0, -1.0, 0.3],
  ] as const;

  return `${atoms
    .map(([atom, x, y, z], index) => {
      const serial = String(index + 1).padStart(5, " ");
      const atomName = atom.padStart(4, " ");
      const xs = x.toFixed(3).padStart(8, " ");
      const ys = y.toFixed(3).padStart(8, " ");
      const zs = z.toFixed(3).padStart(8, " ");
      return `ATOM  ${serial} ${atomName} ${residue} A${resno}    ${xs}${ys}${zs}  1.00${bfactor}           ${atom[0]}`;
    })
    .join("\n")}
TER
END
`;
}

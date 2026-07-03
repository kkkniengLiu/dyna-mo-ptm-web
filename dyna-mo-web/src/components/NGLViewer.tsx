"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type ColorMode = "plddt" | "secondary";
type Speed = 0.5 | 1 | 2 | 4;

type NGLViewerProps = {
  pdbUrl: string;
  topologyUrl?: string;
  trajectoryUrl?: string;
  trajectoryDurationNs?: number | null;
  siteResid: number;
  siteResname: string;
  sitePlddt: number;
};

type NglComponent = {
  addRepresentation: (
    type: string,
    options: Record<string, unknown>,
  ) => unknown;
  addTrajectory: (
    trajPath?: string | NglFrames,
    params?: Record<string, unknown>,
  ) => NglTrajectoryElement;
  removeAllRepresentations: () => void;
  autoView: () => void;
};

type NglFrames = {
  type?: string;
};

type NglModule = {
  Stage: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
  autoLoad: (
    source: string | Blob,
    options: Record<string, unknown>,
  ) => Promise<NglFrames>;
};

type NglStage = {
  dispose: () => void;
  handleResize: () => void;
  removeAllComponents: () => void;
  loadFile: (
    source: string | Blob,
    options: { ext: "pdb" | "gro" },
  ) => Promise<NglComponent>;
};

type NglTrajectoryPlayer = {
  isRunning: boolean;
  play: () => void;
  pause: () => void;
  setParameters: (params: Record<string, unknown>) => void;
};

type NglSignal = {
  add: (handler: (...args: unknown[]) => void) => void;
  remove?: (handler: (...args: unknown[]) => void) => void;
};

type NglTrajectory = {
  frameCount: number;
  currentFrame: number;
  player: NglTrajectoryPlayer;
  signals?: {
    frameChanged?: NglSignal;
    countChanged?: NglSignal;
  };
};

type NglTrajectoryElement = {
  trajectory: NglTrajectory;
  setFrame: (frame: number) => void;
};

export function NGLViewer({
  pdbUrl,
  topologyUrl,
  trajectoryUrl,
  trajectoryDurationNs,
  siteResid,
  siteResname,
  sitePlddt,
}: NGLViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<NglStage | null>(null);
  const componentRef = useRef<NglComponent | null>(null);
  const trajectoryRef = useRef<NglTrajectoryElement | null>(null);
  const colorModeRef = useRef<ColorMode>("plddt");
  const speedRef = useRef<Speed>(1);
  const loopRef = useRef(true);
  const [colorMode, setColorMode] = useState<ColorMode>("plddt");
  const [status, setStatus] = useState("Loading structure viewer");
  const [hasTrajectory, setHasTrajectory] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [frameCount, setFrameCount] = useState(1);
  const [speed, setSpeed] = useState<Speed>(1);
  const [loop, setLoop] = useState(true);
  const siteSelection = useMemo(
    () => buildSiteSelection(siteResid, siteResname),
    [siteResid, siteResname],
  );
  const fallbackPdb = useMemo(
    () => buildFallbackPdb(siteResid, siteResname, sitePlddt),
    [sitePlddt, siteResid, siteResname],
  );

  const durationNs =
    typeof trajectoryDurationNs === "number" && trajectoryDurationNs > 0
      ? trajectoryDurationNs
      : 10;
  const currentTimeNs =
    frameCount > 1 ? (frame / (frameCount - 1)) * durationNs : 0;

  useEffect(() => {
    speedRef.current = speed;
    applyPlayerParameters(trajectoryRef.current, speed, loop);
  }, [loop, speed]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function renderStructure() {
      const element = containerRef.current;
      if (!element) {
        return;
      }

      setStatus("Loading structure viewer");
      setHasTrajectory(false);
      setIsPlaying(false);
      setFrame(0);
      setFrameCount(1);
      const ngl = (await import("ngl")) as unknown as NglModule;
      if (disposed) {
        return;
      }

      const stage = new ngl.Stage(element, {
        backgroundColor: "white",
        mousePreset: "pymol",
        panSpeed: 1.2,
        rotateSpeed: 2,
        zoomSpeed: 1.2,
      }) as unknown as NglStage;
      stageRef.current = stage;
      cleanup = () => {
        stageRef.current = null;
        componentRef.current = null;
        trajectoryRef.current = null;
        stage.dispose();
      };

      stage.removeAllComponents();
      const topologyPdbUrl = topologyUrl?.replace(/\.gro($|\?)/, ".pdb$1");
      const trajectoryAvailable = await hasHostedAsset(trajectoryUrl);
      const topologyAvailable = await hasHostedAsset(topologyUrl);
      const topologyPdbAvailable = await hasHostedAsset(topologyPdbUrl);
      const displayTopologyUrl =
        topologyPdbAvailable && topologyPdbUrl ? topologyPdbUrl : topologyUrl;
      const displayTopologyExt = topologyPdbAvailable ? "pdb" : "gro";
      const trajectoryReady =
        trajectoryAvailable && topologyAvailable && displayTopologyUrl;
      const displayStructure = await loadStructureWithFallback(
        stage,
        pdbUrl,
        fallbackPdb,
      );
      const trajectoryComponent = trajectoryReady
        ? await stage.loadFile(displayTopologyUrl, {
            ext: displayTopologyExt,
          })
        : null;
      trajectoryComponent?.removeAllRepresentations();
      const component = displayStructure.component;
      const isFallback = displayStructure.isFallback;
      const source = trajectoryReady ? "trajectory" : displayStructure.source;

      if (disposed) {
        return;
      }

      componentRef.current = component;
      applyStructureRepresentations(
        component,
        colorModeRef.current,
        siteSelection,
      );

      if (source === "trajectory" && trajectoryUrl && trajectoryComponent) {
        try {
          const trajectoryBlob = await fetch(trajectoryUrl).then((response) => {
            if (!response.ok) {
              throw new Error(`trajectory fetch failed: ${response.status}`);
            }
            return response.blob();
          });
          const trajectoryFrames = await ngl.autoLoad(trajectoryBlob, {
            ext: "xtc",
          });
          const trajectory = trajectoryComponent.addTrajectory(trajectoryFrames, {
            superpose: true,
            removePbc: true,
            deltaTime: durationNs * 1000,
          });
          trajectoryRef.current = trajectory;
          wireTrajectorySignals(trajectory, setFrame, setFrameCount);
          applyPlayerParameters(trajectory, speedRef.current, loopRef.current);
          trajectory.setFrame(0);
          setFrameCount(Math.max(trajectory.trajectory.frameCount || 1, 1));
          setHasTrajectory(true);
          setStatus("Trajectory loaded: rep1 MD playback ready");
          window.setTimeout(() => component.autoView(), 300);
        } catch (error) {
          console.error("Failed to load trajectory", error);
          setHasTrajectory(false);
          setStatus("trajectory rendering in preparation");
        }
      } else {
        setStatus(
          isFallback
            ? "PDB file unavailable; showing residue placeholder"
            : "trajectory rendering in preparation; static AF3 input shown",
        );
      }

      component.autoView();

      const onResize = () => stage.handleResize();
      window.addEventListener("resize", onResize);
      cleanup = () => {
        window.removeEventListener("resize", onResize);
        stageRef.current = null;
        componentRef.current = null;
        trajectoryRef.current = null;
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
  }, [
    durationNs,
    fallbackPdb,
    pdbUrl,
    siteSelection,
    topologyUrl,
    trajectoryUrl,
  ]);

  useEffect(() => {
    colorModeRef.current = colorMode;
    const component = componentRef.current;
    if (!component) {
      return;
    }
    applyStructureRepresentations(component, colorMode, siteSelection);
  }, [colorMode, siteSelection]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") {
        componentRef.current?.autoView();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function togglePlayback() {
    const player = trajectoryRef.current?.trajectory.player;
    if (!player) {
      return;
    }
    if (player.isRunning) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }

  function setTrajectoryFrame(nextFrame: number) {
    const boundedFrame = Math.max(0, Math.min(nextFrame, frameCount - 1));
    trajectoryRef.current?.setFrame(boundedFrame);
    setFrame(boundedFrame);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm text-muted-foreground">{status}</div>
          <div className="mt-1 text-xs text-slate-500">
            Left-drag to rotate, Shift-drag to pan, scroll to zoom; press R to
            reset view.
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={colorMode === "plddt" ? "default" : "outline"}
            size="sm"
            onClick={() => setColorMode("plddt")}
          >
            pLDDT cartoon
          </Button>
          <Button
            type="button"
            variant={colorMode === "secondary" ? "default" : "outline"}
            size="sm"
            onClick={() => setColorMode("secondary")}
          >
            Secondary-structure cartoon
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Reset view"
            title="Reset 3D view"
            onClick={() => componentRef.current?.autoView()}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative h-[420px] touch-none overflow-hidden rounded-lg border bg-white">
        {status === "Loading structure viewer" ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-fine-grid">
            <div className="rounded-lg border bg-white/88 p-5 text-center shadow-sm">
              <p className="font-medium text-slate-900">
                Preparing structure viewport
              </p>
              <p className="mt-1 text-sm text-slate-500">
                raw.pdb or hosted trajectory will render here when mounted
              </p>
            </div>
          </div>
        ) : null}
        <div
          ref={containerRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          aria-label="NGL structure and trajectory viewer"
        />
      </div>
      <div className="rounded-lg border bg-white/80 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Button
            type="button"
            variant={hasTrajectory ? "default" : "outline"}
            size="sm"
            disabled={!hasTrajectory}
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <Pause className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <label className="flex min-w-0 flex-1 items-center gap-3 text-sm text-slate-600">
            <span className="whitespace-nowrap">Frame</span>
            <input
              type="range"
              min={0}
              max={Math.max(frameCount - 1, 0)}
              value={frame}
              disabled={!hasTrajectory}
              onChange={(event) => setTrajectoryFrame(Number(event.target.value))}
              className="min-w-0 flex-1 accent-[#10324a]"
            />
            <span className="whitespace-nowrap font-mono text-xs">
              {frame}/{Math.max(frameCount - 1, 0)}
            </span>
          </label>
          <div className="font-mono text-xs text-slate-600">
            {currentTimeNs.toFixed(2)} / {durationNs.toFixed(1)} ns
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs font-semibold uppercase text-slate-500">
              Speed
            </span>
            {([0.5, 1, 2, 4] as const).map((value) => (
              <button
                key={value}
                type="button"
                disabled={!hasTrajectory}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  speed === value
                    ? "border-[#10324a] bg-[#10324a] text-white"
                    : "bg-white text-slate-700"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => setSpeed(value)}
              >
                {value}x
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={loop}
              disabled={!hasTrajectory}
              onChange={(event) => setLoop(event.target.checked)}
              className="h-4 w-4 accent-[#10324a]"
            />
            Loop playback
          </label>
          {!hasTrajectory ? (
            <span className="text-xs text-slate-500">
              Hosted .xtc/.gro not found for this system; static AF3 structure
              remains available.
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function hasHostedAsset(url: string | undefined) {
  if (!url) {
    return false;
  }
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function loadStructureWithFallback(
  stage: NglStage,
  pdbUrl: string,
  fallbackPdb: string,
) {
  try {
    return {
      component: await stage.loadFile(pdbUrl, { ext: "pdb" }),
      isFallback: false,
      source: "pdb" as const,
    };
  } catch {
    return {
      component: await stage.loadFile(
        new Blob([fallbackPdb], { type: "chemical/x-pdb" }),
        { ext: "pdb" },
      ),
      isFallback: true,
      source: "fallback" as const,
    };
  }
}

function applyStructureRepresentations(
  component: NglComponent,
  colorMode: ColorMode,
  siteSelection: string,
) {
  const colorScheme = colorMode === "plddt" ? "bfactor" : "sstruc";
  component.removeAllRepresentations();
  component.addRepresentation("cartoon", {
    sele: "polymer",
    colorScheme,
    aspectRatio: 5,
    radiusScale: 0.85,
    smoothSheet: true,
    subdiv: 18,
  });
  component.addRepresentation("licorice", {
    sele: siteSelection,
    color: "element",
    multipleBond: true,
    radius: 0.18,
  });
}

function wireTrajectorySignals(
  trajectory: NglTrajectoryElement,
  setFrame: (frame: number) => void,
  setFrameCount: (count: number) => void,
) {
  const onFrameChanged = (value: unknown) => {
    if (typeof value === "number") {
      setFrame(value);
    } else {
      setFrame(trajectory.trajectory.currentFrame ?? 0);
    }
  };
  const onCountChanged = (value: unknown) => {
    if (typeof value === "number") {
      setFrameCount(Math.max(value, 1));
    } else {
      setFrameCount(Math.max(trajectory.trajectory.frameCount || 1, 1));
    }
  };
  trajectory.trajectory.signals?.frameChanged?.add(onFrameChanged);
  trajectory.trajectory.signals?.countChanged?.add(onCountChanged);
  window.setTimeout(() => {
    setFrameCount(Math.max(trajectory.trajectory.frameCount || 1, 1));
    setFrame(trajectory.trajectory.currentFrame || 0);
  }, 500);
}

function applyPlayerParameters(
  trajectory: NglTrajectoryElement | null,
  speed: Speed,
  loop: boolean,
) {
  const player = trajectory?.trajectory.player;
  if (!player) {
    return;
  }
  player.setParameters({
    step: 1,
    timeout: Math.max(12, Math.round(90 / speed)),
    mode: loop ? "loop" : "once",
    direction: "forward",
  });
}

function buildSiteSelection(siteResid: number, siteResname: string) {
  const ccdCode = siteResname
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return ccdCode && ccdCode !== "UNK"
    ? `resname ${ccdCode}`
    : `resno ${siteResid}`;
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

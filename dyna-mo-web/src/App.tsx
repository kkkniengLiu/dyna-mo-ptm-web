import { useVirtualizer } from "@tanstack/react-virtual";
import Fuse from "fuse.js";
import {
  Activity,
  BarChart3,
  Box,
  Database,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Search,
  Table2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { NGLViewer } from "@/components/NGLViewer";
import { Button } from "@/components/ui/button";
import type { PublicSystem, StaticDataset } from "@/types/static-data";

const BASE = import.meta.env.BASE_URL;

const visibleColumns: Array<{
  key: keyof PublicSystem;
  label: string;
  width: string;
  numeric?: boolean;
}> = [
  { key: "id", label: "System", width: "minmax(170px,1.5fr)" },
  { key: "uniprot", label: "UniProt", width: "minmax(90px,0.8fr)" },
  { key: "ptm_label", label: "PTM", width: "minmax(105px,0.95fr)" },
  { key: "mod_residue", label: "Site", width: "minmax(78px,0.65fr)" },
  { key: "status", label: "Status", width: "minmax(78px,0.7fr)" },
  { key: "site_status", label: "Site status", width: "minmax(100px,0.85fr)" },
  {
    key: "n_residues",
    label: "Length",
    width: "minmax(78px,0.65fr)",
    numeric: true,
  },
  {
    key: "site_plddt",
    label: "pLDDT (0-100)",
    width: "minmax(112px,0.9fr)",
    numeric: true,
  },
  {
    key: "rmsd_equil_mean_A",
    label: "RMSD (Å)",
    width: "minmax(86px,0.7fr)",
    numeric: true,
  },
  {
    key: "rg_mean_A",
    label: "Rg (Å)",
    width: "minmax(78px,0.65fr)",
    numeric: true,
  },
  {
    key: "rmsf_mean_A",
    label: "RMSF (Å)",
    width: "minmax(88px,0.7fr)",
    numeric: true,
  },
  { key: "site_ss_dominant", label: "DSSP", width: "minmax(70px,0.55fr)" },
];

type CitationFormat = "bibtex" | "ris" | "endnote";

const CITATION_TEXT: Record<CitationFormat, string> = {
  bibtex: `@article{liu2027dynamopt,
  title   = {Dyna-MO PTM: a unified molecular dynamics resource for post-translationally modified proteins},
  author  = {Liu, Kaining and Chi, Ying},
  journal = {Nucleic Acids Research},
  year    = {2027},
  doi     = {__PAPER_DOI__}
}`,
  ris: `TY  - JOUR
ID  - liu2027dynamopt
TI  - Dyna-MO PTM: a unified molecular dynamics resource for post-translationally modified proteins
AU  - Liu, Kaining
AU  - Chi, Ying
JO  - Nucleic Acids Research
PY  - 2027
DO  - __PAPER_DOI__
ER  -`,
  endnote: `%0 Journal Article
%F liu2027dynamopt
%T Dyna-MO PTM: a unified molecular dynamics resource for post-translationally modified proteins
%A Liu, Kaining
%A Chi, Ying
%J Nucleic Acids Research
%D 2027
%R __PAPER_DOI__`,
};

export default function App() {
  const [dataset, setDataset] = useState<StaticDataset | null>(null);
  const [route, setRoute] = useState(getRoutePath());

  useEffect(() => {
    fetch(assetUrl("data/master_table.json"))
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load master_table.json");
        return response.json() as Promise<StaticDataset>;
      })
      .then(setDataset)
      .catch((error: unknown) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(getRoutePath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(path: string) {
    window.history.pushState(null, "", withBase(path));
    const [pathWithoutHash, hash] = path.split("#");
    setRoute(pathWithoutHash.split("?")[0] || "/");
    window.setTimeout(() => {
      if (hash) {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 0);
  }

  if (!dataset) {
    return <LoadingShell />;
  }

  const systemMatch = route.match(/^\/system\/(.+)$/);
  const page = systemMatch
    ? "system"
    : route === "/browse"
      ? "browse"
      : route === "/about"
        ? "about"
        : "home";
  const selectedSystem = systemMatch
    ? dataset.systems.find(
        (system) => system.id === decodeURIComponent(systemMatch[1]),
      )
    : null;

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950 antialiased">
      <Header page={page} navigate={navigate} />
      {page === "browse" ? (
        <BrowsePage dataset={dataset} navigate={navigate} />
      ) : page === "about" ? (
        <AboutPage />
      ) : page === "system" && selectedSystem ? (
        <SystemPage system={selectedSystem} navigate={navigate} />
      ) : (
        <HomePage dataset={dataset} navigate={navigate} />
      )}
      <Footer />
    </div>
  );
}

function Header({
  page,
  navigate,
}: {
  page: string;
  navigate: (path: string) => void;
}) {
  const links = [
    { path: "/", label: "Overview" },
    { path: "/browse", label: "Browse" },
    { path: "/about#methods", label: "Methods" },
    { path: "/about#api", label: "API" },
    { path: "/about#faq", label: "FAQ" },
    { path: "/about", label: "About" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-950/10 bg-[#10324a]/[0.96] text-white shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <button
          className="flex items-center gap-3 font-semibold"
          onClick={() => navigate("/")}
        >
          <span className="grid h-9 w-9 place-items-center rounded-md bg-white text-sm font-bold text-[#10324a] shadow-sm">
            DM
          </span>
          <span className="hidden sm:inline">Dyna-MO PTM</span>
        </button>
        <nav className="hidden rounded-md border border-white/15 bg-white/[0.08] p-1 shadow-sm md:flex">
          {links.map((link) => (
            <button
              key={link.path}
              className={`rounded-full px-4 py-2 text-sm transition ${
                (
                  link.path === "/"
                    ? page === "home"
                    : routeKey(link.path.split("#")[0]) === page
                )
                  ? "bg-white text-[#10324a]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </button>
          ))}
        </nav>
        <Button
          className="bg-[#0f766e] text-white hover:bg-[#0d665f]"
          onClick={() => navigate("/browse")}
        >
          Browse database
        </Button>
      </div>
    </header>
  );
}

function HomePage({
  dataset,
  navigate,
}: {
  dataset: StaticDataset;
  navigate: (path: string) => void;
}) {
  const [heroQuery, setHeroQuery] = useState("");
  const [citationFormat, setCitationFormat] =
    useState<CitationFormat>("bibtex");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const searchExamples = dataset.systems.slice(0, 4);
  const citationLabel =
    citationFormat === "bibtex"
      ? "BibTeX"
      : citationFormat === "ris"
        ? "RIS"
        : "EndNote";
  const copyLabel =
    copyState === "copied"
      ? "Copied"
      : copyState === "failed"
        ? "Copy failed"
        : `Copy ${citationLabel}`;

  function submitHeroSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = heroQuery.trim();
    navigate(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse");
  }

  function copyCitation() {
    void navigator.clipboard
      .writeText(CITATION_TEXT[citationFormat])
      .then(() => {
        setCopyState("copied");
        window.setTimeout(() => setCopyState("idle"), 1600);
      })
      .catch(() => setCopyState("failed"));
  }

  return (
    <main className="overflow-hidden">
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="academic-hero" />
        <div className="absolute inset-0 static-grid opacity-70" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-10 lg:min-h-[620px] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-md border border-[#10324a]/15 bg-white/80 px-3 py-2 text-sm font-medium text-[#10324a] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#2ca02c]" />
              Dyna-MO PTM v0.2 release
            </div>
            <div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.04] text-[#071827] md:text-6xl">
                Dyna-MO PTM
              </h1>
              <p className="mt-3 max-w-3xl text-2xl font-medium leading-9 text-[#17415a]">
                Molecular dynamics resource for post-translationally modified
                proteins.
              </p>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Browse 1,095 uniformly simulated PTM protein systems across six
                chemistries, with per-system MD quality, site biophysics, local
                structural context and AF3 confidence descriptors.
              </p>
            </div>
            <form className="hero-search-shell" onSubmit={submitHeroSearch}>
              <Search className="h-5 w-5 text-[#17415a]" />
              <input
                value={heroQuery}
                onChange={(event) => setHeroQuery(event.target.value)}
                placeholder="Search by system ID, UniProt accession or PTM type"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
              />
              <button
                className="rounded-md bg-[#10324a] px-4 py-2 text-sm font-semibold text-white"
                type="submit"
              >
                Search
              </button>
            </form>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="py-1 text-slate-500">Examples:</span>
              {searchExamples.map((system) => (
                <button
                  key={system.id}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 font-mono transition hover:border-[#10324a] hover:text-[#10324a]"
                  onClick={() =>
                    navigate(`/browse?q=${encodeURIComponent(system.uniprot)}`)
                  }
                >
                  {system.uniprot}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#10324a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2639]"
                onClick={() => navigate("/browse")}
              >
                Browse the database
                <Search className="h-4 w-4" />
              </button>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#10324a] shadow-sm transition hover:border-[#10324a]"
                href={assetUrl("data/master_table_all_v2.csv")}
              >
                Download descriptor CSV
                <Download className="h-4 w-4" />
              </a>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#10324a] shadow-sm transition hover:border-[#10324a]"
                onClick={() => navigate("/about")}
              >
                Citation / About
                <FileText className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <ReleaseMetric
                label="Systems"
                value={dataset.stats.systems.toLocaleString()}
              />
              <ReleaseMetric label="Simulation" value="32.85 us" />
              <ReleaseMetric label="PTM classes" value="6" />
            </div>
            <PtmRibbon counts={dataset.stats.counts} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="relative"
          >
            <PtmOrbit counts={dataset.stats.counts} />
          </motion.div>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-10 lg:grid-cols-4">
        <StatPanel
          label="Systems"
          value={dataset.stats.systems.toLocaleString()}
        />
        <StatPanel label="PTM types" value="6" />
        <StatPanel
          label="AF3 inputs available"
          value={dataset.stats.local_structures.toLocaleString()}
          note="K/R-PTM only; phospho subset in v0.3"
        />
        <StatPanel
          label="Median length"
          value={`${dataset.stats.median_length ?? "NA"} aa`}
        />
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 pb-10 lg:grid-cols-4">
        <FeatureCommand
          index="01"
          icon={Search}
          title="Search database"
          text="Jump from UniProt or system IDs into the descriptor browser."
          onClick={() => navigate("/browse")}
        />
        <FeatureCommand
          index="02"
          icon={Box}
          title="Inspect 3D"
          text="Open local K/R-PTM AF3 structures in the NGL viewer."
          onClick={() =>
            navigate(
              `/system/${encodeURIComponent(dataset.systems.find((system) => system.has_structure)?.id ?? dataset.systems[0].id)}`,
            )
          }
        />
        <FeatureCommand
          index="03"
          icon={Download}
          title="Download data"
          text="Use the descriptor CSV or system-level Zenodo links."
          href={assetUrl("data/master_table_all_v2.csv")}
        />
        <FeatureCommand
          index="04"
          icon={FileText}
          title="Cite resource"
          text="Methods, release notes and placeholder citation live on About."
          onClick={() => navigate("/about")}
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="chromatic-card rounded-xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase text-slate-500">
                Citation export
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Cite Dyna-MO PTM</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Placeholder record for manuscript drafting. Replace
                __PAPER_DOI__ after acceptance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["bibtex", "ris", "endnote"] as CitationFormat[]).map(
                (format) => (
                  <button
                    key={format}
                    className={`rounded-md border px-3 py-2 text-sm font-medium ${
                      citationFormat === format
                        ? "bg-[#10324a] text-white"
                        : "bg-white text-slate-700"
                    }`}
                    onClick={() => setCitationFormat(format)}
                  >
                    {format === "bibtex"
                      ? "BibTeX"
                      : format === "ris"
                        ? "RIS"
                        : "EndNote"}
                  </button>
                ),
              )}
              <button
                className="rounded-md border border-[#10324a] bg-white px-3 py-2 text-sm font-medium text-[#10324a]"
                onClick={copyCitation}
              >
                {copyLabel}
              </button>
            </div>
          </div>
          <pre className="mt-4 max-h-72 overflow-auto rounded-lg border bg-slate-950 p-4 text-sm leading-6 text-slate-100">
            {CITATION_TEXT[citationFormat]}
          </pre>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="chromatic-card rounded-xl p-5">
          <h2 className="text-2xl font-semibold">Publication overview</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Dyna-MO PTM covers acetyl-lysine, methyl-lysine, methyl-arginine,
            phospho-serine, phospho-threonine and phospho-tyrosine. All systems
            share a unified CHARMM36m + TIP3P protocol with three 10 ns
            replicas.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {dataset.stats.counts.map((item) => (
              <PtmChip
                key={item.ptm_type}
                label={item.label}
                color={item.color}
              />
            ))}
          </div>
        </div>
        <div className="chromatic-card rounded-xl p-4">
          <img
            src={assetUrl("figures/fig1_dataset_overview_v2.png")}
            alt="Figure 1 dataset composition and length distribution"
            className="w-full rounded-lg border"
          />
        </div>
      </section>
    </main>
  );
}

function BrowsePage({
  dataset,
  navigate,
}: {
  dataset: StaticDataset;
  navigate: (path: string) => void;
}) {
  const initialParamsRef = useRef<URLSearchParams | null>(null);
  if (initialParamsRef.current === null) {
    initialParamsRef.current = new URLSearchParams(window.location.search);
  }
  const initialParams = initialParamsRef.current;
  const [query, setQuery] = useState(() => initialParams.get("q") ?? "");
  const [activePtm, setActivePtm] = useState<string | null>(
    () => initialParams.get("ptm_type") || null,
  );
  const [minLength, setMinLength] = useState(
    () => initialParams.get("min_length") ?? "",
  );
  const [maxLength, setMaxLength] = useState(
    () => initialParams.get("max_length") ?? "",
  );
  const [dssp, setDssp] = useState(() => initialParams.get("dssp") ?? "");
  const [sortKey, setSortKey] = useState<keyof PublicSystem>("ptm_type");
  const [sortAsc, setSortAsc] = useState(true);
  const parentRef = useRef<HTMLDivElement | null>(null);

  const fuse = useMemo(
    () =>
      new Fuse(dataset.systems, { keys: ["id", "uniprot"], threshold: 0.28 }),
    [dataset.systems],
  );

  const dsspOptions = useMemo(
    () =>
      Array.from(
        new Set(
          dataset.systems
            .map((system) => system.site_ss_dominant)
            .filter((value) => value && value !== "not available"),
        ),
      ).sort(),
    [dataset.systems],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (activePtm) params.set("ptm_type", activePtm);
    if (minLength.trim()) params.set("min_length", minLength.trim());
    if (maxLength.trim()) params.set("max_length", maxLength.trim());
    if (dssp) params.set("dssp", dssp);

    const suffix = params.toString();
    const nextUrl = withBase(`/browse${suffix ? `?${suffix}` : ""}`);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [activePtm, dssp, maxLength, minLength, query]);

  const filtered = useMemo(() => {
    let rows = query.trim()
      ? fuse.search(query.trim()).map((hit) => hit.item)
      : dataset.systems;
    if (activePtm) rows = rows.filter((row) => row.ptm_type === activePtm);
    const parsedMin = Number(minLength);
    const parsedMax = Number(maxLength);
    if (Number.isFinite(parsedMin) && minLength.trim()) {
      rows = rows.filter(
        (row) => row.n_residues !== null && row.n_residues >= parsedMin,
      );
    }
    if (Number.isFinite(parsedMax) && maxLength.trim()) {
      rows = rows.filter(
        (row) => row.n_residues !== null && row.n_residues <= parsedMax,
      );
    }
    if (dssp) rows = rows.filter((row) => row.site_ss_dominant === dssp);
    return [...rows].sort((a, b) => compareRows(a, b, sortKey, sortAsc));
  }, [
    activePtm,
    dataset.systems,
    dssp,
    fuse,
    maxLength,
    minLength,
    query,
    sortAsc,
    sortKey,
  ]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 14,
  });

  const gridTemplate = visibleColumns.map((column) => column.width).join(" ");
  const activeFilterCount = [
    query.trim(),
    activePtm,
    minLength.trim(),
    maxLength.trim(),
    dssp,
  ].filter(Boolean).length;

  function resetFilters() {
    setQuery("");
    setActivePtm(null);
    setMinLength("");
    setMaxLength("");
    setDssp("");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="chromatic-card ptm-accent mb-6 grid gap-5 rounded-xl p-5 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Descriptor browser
          </p>
          <h1 className="mt-2 text-4xl font-semibold">Browse systems</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Search system IDs or UniProt accessions, filter by PTM type and sort
            visible descriptor columns. Rows link to static system pages.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <StatPanel
            label="Visible"
            value={filtered.length.toLocaleString()}
            compact
          />
          <StatPanel
            label="Total"
            value={dataset.stats.systems.toLocaleString()}
            compact
          />
          <StatPanel
            label="AF3 inputs available"
            value={dataset.stats.local_structures.toLocaleString()}
            note="K/R-PTM only; phospho subset in v0.3"
            compact
          />
        </div>
      </div>

      <div className="chromatic-card rounded-xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search system or UniProt"
              className="h-11 w-full rounded-md border bg-white/90 pl-9 pr-3 text-sm shadow-inner outline-none ring-slate-950/10 focus:ring-4"
            />
          </label>
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border bg-slate-950 px-4 text-sm font-medium text-white shadow-lg shadow-slate-950/10"
            href={assetUrl("data/master_table_all_v2.csv")}
          >
            <Download className="h-4 w-4" />
            CSV
          </a>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActivePtm(null)}
            className={`rounded-full border px-3 py-1.5 text-sm ${!activePtm ? "bg-slate-950 text-white" : "bg-white"}`}
          >
            All PTMs
          </button>
          {dataset.stats.counts.map((item) => (
            <button
              key={item.ptm_type}
              onClick={() =>
                setActivePtm(activePtm === item.ptm_type ? null : item.ptm_type)
              }
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                activePtm === item.ptm_type ? "text-white" : "bg-white"
              }`}
              style={{
                backgroundColor:
                  activePtm === item.ptm_type ? item.color : undefined,
                borderColor: item.color,
              }}
            >
              {item.label} - {item.count}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
            <span className="font-semibold text-slate-950">
              {activeFilterCount} active filters
            </span>
            <button
              className="text-[#10324a] underline-offset-2 hover:underline"
              onClick={resetFilters}
            >
              Reset all
            </button>
          </div>
          <span className="text-xs text-slate-500">
            pLDDT values use a 0-100 AlphaFold confidence scale.
          </span>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Minimum residues
            </span>
            <input
              aria-label="Minimum residues"
              type="number"
              min="0"
              value={minLength}
              onChange={(event) => setMinLength(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none ring-slate-950/10 focus:ring-4"
              placeholder="e.g. 200"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Maximum residues
            </span>
            <input
              aria-label="Maximum residues"
              type="number"
              min="0"
              value={maxLength}
              onChange={(event) => setMaxLength(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none ring-slate-950/10 focus:ring-4"
              placeholder="e.g. 500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Dominant DSSP
            </span>
            <select
              aria-label="Dominant DSSP"
              value={dssp}
              onChange={(event) => setDssp(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none ring-slate-950/10 focus:ring-4"
            >
              <option value="">All secondary structure</option>
              {dsspOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button
            className="h-10 justify-self-end rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-[#10324a] hover:text-[#10324a]"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="chromatic-card mt-5 overflow-hidden rounded-xl p-0">
        <div
          className="grid border-b border-white/10 bg-[#06131c] text-xs font-semibold uppercase text-slate-300"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {visibleColumns.map((column) => (
            <button
              key={String(column.key)}
              className="px-4 py-3 text-left"
              onClick={() => {
                if (sortKey === column.key) setSortAsc(!sortAsc);
                else {
                  setSortKey(column.key);
                  setSortAsc(true);
                }
              }}
            >
              {column.label}
            </button>
          ))}
        </div>
        <div ref={parentRef} className="h-[650px] overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = filtered[virtualRow.index];
              return (
                <button
                  key={row.id}
                  data-testid={
                    virtualRow.index === 0 ? "system-row-0" : undefined
                  }
                  className="absolute left-0 grid w-full border-b border-slate-100 text-left text-sm transition hover:bg-[#f0faf7]"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: gridTemplate,
                  }}
                  onClick={() =>
                    navigate(`/system/${encodeURIComponent(row.id)}`)
                  }
                >
                  {visibleColumns.map((column) => (
                    <span
                      key={String(column.key)}
                      className="truncate px-4 py-3"
                      title={cellTitle(row, column.key)}
                    >
                      {renderBrowseCell(row, column.key)}
                    </span>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function SystemPage({
  system,
  navigate,
}: {
  system: PublicSystem;
  navigate: (path: string) => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const rawEntries = useMemo(
    () =>
      Object.entries(system.raw).filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      ),
    [system.raw],
  );

  useEffect(() => {
    const elementId = "dynamo-system-jsonld";
    const previousTitle = document.title;
    document.getElementById(elementId)?.remove();

    const absoluteAssetUrl = (path: string) =>
      new URL(assetUrl(path), window.location.origin).toString();
    const systemUrl = `${window.location.origin}${withBase(
      `/system/${encodeURIComponent(system.id)}`,
    )}`;
    const distribution = [
      {
        "@type": "DataDownload",
        name: "Descriptor CSV",
        encodingFormat: "text/csv",
        contentUrl: absoluteAssetUrl("data/master_table_all_v2.csv"),
      },
      {
        "@type": "DataDownload",
        name: "System JSON",
        encodingFormat: "application/json",
        contentUrl: absoluteAssetUrl(`api/system/${system.id}.json`),
      },
    ];
    if (system.has_structure) {
      distribution.push({
        "@type": "DataDownload",
        name: "AF3 input PDB",
        encodingFormat: "chemical/x-pdb",
        contentUrl: absoluteAssetUrl(`structures/${system.id}.pdb`),
      });
    }

    const script = document.createElement("script");
    script.id = elementId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: `${system.id} ${system.ptm_label} molecular dynamics system`,
      identifier: system.id,
      url: systemUrl,
      description: `Dyna-MO PTM descriptor row for ${system.uniprot} ${system.mod_residue}, a ${system.ptm_label} molecular dynamics system.`,
      isPartOf: {
        "@type": "Dataset",
        name: "Dyna-MO PTM",
      },
      keywords: [
        "post-translational modification",
        "molecular dynamics",
        system.ptm_label,
        system.uniprot,
      ],
      license: "https://creativecommons.org/licenses/by/4.0/",
      creator: {
        "@type": "Organization",
        name: "Dyna-MO PTM",
      },
      variableMeasured: Object.keys(system.raw),
      sameAs: [`https://www.uniprot.org/uniprotkb/${system.uniprot}`],
      distribution,
    });
    document.head.appendChild(script);
    document.title = `${system.id} | Dyna-MO PTM`;

    return () => {
      script.remove();
      document.title = previousTitle;
    };
  }, [system]);

  const groups = [
    {
      title: "Provenance",
      items: [
        ["System", system.id],
        ["UniProt", system.uniprot],
        ["PTM type", system.ptm_label],
        ["CCD code", system.ccd_code],
        ["Modified residue", system.mod_residue],
        ["Row status", system.status],
        ["Release flag", system.final_flag],
        ["Schema version", system.schema_version],
        ["Replica count", system.raw.n_rep_ok || system.raw.n_reps || "3"],
      ],
    },
    {
      title: "Global QC",
      items: [
        ["RMSD equil mean", formatNumber(system.rmsd_equil_mean_A, 2, " A")],
        ["Rg mean", formatNumber(system.rg_mean_A, 2, " A")],
        ["RMSF mean", formatNumber(system.rmsf_mean_A, 2, " A")],
        ["RMSF max", formatNumber(system.rmsf_max_A, 2, " A")],
        ["Simulation time", formatNumber(system.sim_time_ns, 1, " ns")],
        ["Total trajectory", formatNumber(system.traj_ns_total, 1, " ns")],
        ["Site status", system.site_status],
      ],
    },
    {
      title: "Site biophysics",
      items: [
        ["Site SASA", formatNumber(system.sasa_site_mean_nm2, 3, " nm2")],
        ["Salt-bridge contacts", formatNumber(system.n_sb_contacts_mean, 2)],
        ["chi1 dominant", system.chi1_dominant_rotamer || "NA"],
        ["chi2 dominant", system.chi2_dominant_rotamer || "NA"],
        ["Dominant SS", system.site_ss_dominant || "NA"],
      ],
    },
    {
      title: "Site structural context",
      items: [
        ["Terminal proximal", system.terminal_proximal || "not available"],
        ["Burial class", system.burial_class || "not available"],
        ["Site pLDDT", formatNumber(system.site_plddt, 1)],
        ["Local pLDDT 8 A", formatNumber(system.local_pLDDT_8A, 1)],
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="chromatic-card ptm-accent rounded-xl p-5">
        <button
          className="text-sm text-slate-500 hover:text-slate-950"
          onClick={() => navigate("/browse")}
        >
          Back to browser
        </button>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <PtmChip label={system.ptm_label} color={system.color} />
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={`Row: ${system.status}`} />
              <StatusBadge value={`Site: ${system.site_status}`} />
            </div>
            <h1 className="mt-3 text-4xl font-semibold">{system.id}</h1>
            <p className="mt-2 text-slate-600">
              {system.uniprot} - {system.mod_residue} - {system.ptm_family}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {system.has_structure
                ? "Local AF3 input PDB available. The modified residue is highlighted in the 3D viewer."
                : "AF3 input PDB pending for this release; descriptor metadata and trajectory links remain available."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
              href={`https://www.uniprot.org/uniprotkb/${system.uniprot}`}
              target="_blank"
              rel="noreferrer"
              title={`Open UniProt record ${system.uniprot}`}
            >
              UniProt
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
              href={system.zenodo_url}
              title="Open trajectory deposition record"
            >
              Download trajectories
              <Download className="h-4 w-4" />
            </a>
            <a
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
              href={assetUrl(`api/system/${system.id}.json`)}
              title={`Download machine-readable JSON for ${system.id}`}
            >
              Download system JSON
              <FileText className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <section className="chromatic-card rounded-xl p-5">
          <h2 className="text-xl font-semibold">Input AF3 structure</h2>
          <div className="mt-4">
            {system.has_structure ? (
              <NGLViewer
                pdbUrl={assetUrl(`structures/${system.id}.pdb`)}
                siteResid={system.site_num ?? 1}
                siteResname={system.ccd_code || "UNK"}
                sitePlddt={system.local_pLDDT_8A ?? 0}
              />
            ) : (
              <div className="grid h-[420px] place-items-center rounded-lg border bg-slate-50 p-6 text-center">
                <div>
                  <Database className="mx-auto h-9 w-9 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold">
                    PDB not available locally
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    Structure data for phosphorylation systems is hosted at
                    Zenodo for this release. The static page remains available
                    and links out to the deposited record.
                  </p>
                  <a
                    className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                    href={system.zenodo_url}
                  >
                    Open Zenodo record
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="chromatic-card rounded-xl p-5">
          <h2 className="text-xl font-semibold">Descriptor row</h2>
          <div className="mt-4 space-y-5">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2 border-b pb-2 text-sm font-semibold uppercase text-slate-500">
                  {group.title}
                </h3>
                <dl className="grid grid-cols-2 gap-2">
                  {group.items.map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-md border bg-white/75 p-3 shadow-sm"
                    >
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="mt-1 truncate font-medium">
                        {value || "NA"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase text-slate-500">
                  Full source row
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {rawEntries.length} descriptor fields retained from the master
                  table.
                </p>
              </div>
              <button
                className="rounded-md border bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950"
                onClick={() => setShowRaw((value) => !value)}
              >
                {showRaw
                  ? "Hide all descriptor fields"
                  : "Show all descriptor fields"}
              </button>
            </div>
            {showRaw ? (
              <dl
                data-testid="raw-descriptor"
                className="mt-4 max-h-[520px] overflow-auto rounded-lg border bg-slate-50"
              >
                {rawEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid gap-2 border-b border-slate-200 px-3 py-2 text-sm last:border-b-0 sm:grid-cols-[210px_1fr]"
                  >
                    <dt className="font-mono text-xs text-slate-500">{key}</dt>
                    <dd className="break-words text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="chromatic-card rounded-xl p-6">
        <h1 className="text-4xl font-semibold">About Dyna-MO PTM</h1>
        <p className="mt-5 leading-8 text-slate-600">
          Dyna-MO PTM is a molecular dynamics database of 1,095 modified protein
          systems covering acetyl-lysine, methyl-lysine, methyl-arginine,
          phospho-serine, phospho-threonine and phospho-tyrosine. Each system is
          simulated under a unified CHARMM36m + TIP3P protocol with three 10 ns
          replicas and distributed with a 100-column descriptor table.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ToolCard
            icon={Activity}
            title="Methods"
            text="AF3 starts, CHARMM36m, TIP3P, 310 K, NPT production."
          />
          <ToolCard
            icon={FileText}
            title="Data"
            text="Descriptor CSV and figures are static assets in this site."
          />
          <ToolCard
            icon={Filter}
            title="Licences"
            text="Data CC-BY 4.0; code MIT."
          />
        </div>
        <h2 id="methods" className="mt-8 scroll-mt-24 text-2xl font-semibold">
          Methods
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          Each accepted system is prepared from AlphaFold 3 input structures,
          parameterised under CHARMM36m + TIP3P, and simulated as three 10 ns
          replicas. The browser exposes QC, site biophysics, pLDDT confidence
          and secondary-structure descriptors from the release master table.
        </p>
        <h2 id="api" className="mt-8 scroll-mt-24 text-2xl font-semibold">
          API
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          The static API mirrors the web release: use{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">
            /api/systems.json
          </code>{" "}
          for the searchable index and{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">
            /api/system/&lt;id&gt;.json
          </code>{" "}
          for full descriptor rows.
        </p>
        <h2 id="faq" className="mt-8 scroll-mt-24 text-2xl font-semibold">
          FAQ
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          AF3 input structures bundled in this web build currently cover the
          K/R-PTM subset. Phosphorylation-system structure files remain linked
          through the deposition workflow and are labelled as the v0.3 subset.
        </p>
        <h2 className="mt-8 text-2xl font-semibold">Citation</h2>
        <pre className="mt-3 overflow-auto rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
          {CITATION_TEXT.bibtex}
        </pre>
      </div>
    </main>
  );
}

function ReleaseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#071827]">{value}</p>
    </div>
  );
}

function PtmRibbon({ counts }: { counts: StaticDataset["stats"]["counts"] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white/90 p-3 shadow-sm">
      <div className="grid grid-cols-6 gap-2">
        {counts.map((item) => (
          <div
            key={item.ptm_type}
            className="h-2 rounded-full"
            style={{ backgroundColor: item.color }}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        {counts.map((item) => (
          <span key={item.ptm_type}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function PtmOrbit({ counts }: { counts: StaticDataset["stats"]["counts"] }) {
  const max = Math.max(...counts.map((item) => item.count));
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="ptm-orbit-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Dataset release</p>
          <h2 className="mt-1 text-3xl font-semibold text-[#071827]">
            Dyna-MO PTM v0.2
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            A static, citable interface for the descriptor table and AF3 input
            structures used in the Dyna-MO PTM submission package.
          </p>
        </div>
        <span className="rounded-md border bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700">
          {total.toLocaleString()} rows
        </span>
      </div>

      <div className="mt-6 rounded-lg border bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              PTM coverage
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Six modification chemistries represented with the paper figure
              palette.
            </p>
          </div>
          <strong className="text-4xl text-[#10324a]">{counts.length}</strong>
        </div>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
          {counts.map((item) => (
            <span
              key={item.ptm_type}
              title={`${item.label}: ${item.count}`}
              style={{
                width: `${(item.count / total) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {counts.map((item) => (
          <div key={item.ptm_type} className="rounded-lg border bg-white p-3">
            <div className="flex justify-between text-sm text-slate-800">
              <span className="font-medium">{item.label}</span>
              <span className="font-mono text-slate-500">{item.count}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${(item.count / max) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <MiniCapability
          icon={Box}
          label="Structures"
          text="754 AF3 inputs; K/R-PTM only"
        />
        <MiniCapability icon={Table2} label="Descriptors" text="100 columns" />
        <MiniCapability
          icon={BarChart3}
          label="Figures"
          text="NAR draft assets"
        />
      </div>
    </div>
  );
}

function MiniCapability({
  icon: Icon,
  label,
  text,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3 text-slate-800">
      <Icon className="h-4 w-4 text-[#0f766e]" strokeWidth={1.8} />
      <p className="mt-2 text-sm font-semibold">{label}</p>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );
}

function FeatureCommand({
  index,
  icon: Icon,
  title,
  text,
  href,
  onClick,
}: {
  index: string;
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-slate-400">{index}</span>
        <span className="grid h-10 w-10 place-items-center rounded-md border border-[#10324a]/15 bg-[#eef6f7] text-[#10324a]">
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </>
  );

  if (href) {
    return (
      <a className="feature-command" href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className="feature-command text-left" onClick={onClick}>
      {content}
    </button>
  );
}

function ToolCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="chromatic-card rounded-xl p-4"
    >
      <Icon className="h-5 w-5 text-[#14766f]" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
    </motion.div>
  );
}

function StatPanel({
  label,
  value,
  note,
  compact,
}: {
  label: string;
  value: string;
  note?: string;
  compact?: boolean;
}) {
  return (
    <div className={`chromatic-card rounded-xl ${compact ? "p-4" : "p-5"}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 font-semibold ${compact ? "text-2xl" : "text-3xl"}`}>
        {value}
      </p>
      {note ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
      ) : null}
    </div>
  );
}

function PtmChip({
  label,
  color,
  compact,
}: {
  label: string;
  color: string;
  compact?: boolean;
}) {
  return (
    <span
      title={label}
      className={`inline-flex items-center rounded-full border font-semibold shadow-sm ${
        compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"
      }`}
      style={{
        borderColor: color,
        color,
        background: `linear-gradient(180deg, ${color}18, ${color}08)`,
      }}
    >
      {label}
    </span>
  );
}

function renderBrowseCell(system: PublicSystem, key: keyof PublicSystem) {
  if (key === "ptm_label") {
    return <PtmChip label={system.ptm_label} color={system.color} compact />;
  }
  if (key === "site_plddt") {
    return <PlddtCell value={system.site_plddt} />;
  }
  if (key === "site_ss_dominant") {
    return <DsspBadge value={system.site_ss_dominant} />;
  }
  if (key === "status" || key === "site_status") {
    return <StatusBadge value={String(system[key] || "NA")} />;
  }
  return formatCell(system[key]);
}

function cellTitle(system: PublicSystem, key: keyof PublicSystem) {
  if (key === "ptm_label") return system.ptm_label;
  return String(formatCell(system[key]));
}

function PlddtCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-slate-400">NA</span>;
  }
  const clamped = Math.max(0, Math.min(100, value));
  const color =
    clamped >= 90
      ? "#0f766e"
      : clamped >= 70
        ? "#1f77b4"
        : clamped >= 50
          ? "#b7791f"
          : "#b91c1c";

  return (
    <span className="block" title={`${value.toFixed(1)} on 0-100 scale`}>
      <span className="flex items-center justify-between gap-2 text-xs font-medium">
        <span>{value.toFixed(1)}</span>
        <span className="text-slate-400">/100</span>
      </span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </span>
    </span>
  );
}

function DsspBadge({ value }: { value: string }) {
  const key = value || "NA";
  const palette: Record<string, string> = {
    H: "border-red-200 bg-red-50 text-red-700",
    E: "border-amber-200 bg-amber-50 text-amber-700",
    C: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
        palette[key] ?? "border-slate-200 bg-white text-slate-500"
      }`}
      title={`Dominant DSSP: ${key}`}
    >
      {key}
    </span>
  );
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value || "NA";
  const tone = normalized.includes("PASS")
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : normalized.includes("PENDING")
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : normalized.includes("FAIL")
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex max-w-full rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}
      title={normalized}
    >
      <span className="truncate">{normalized}</span>
    </span>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 md:flex-row md:justify-between">
        <span>Dyna-MO PTM v0.2 - static molecular dynamics database</span>
        <span>GitHub / Zenodo / Citation details update upon publication</span>
      </div>
    </footer>
  );
}

function LoadingShell() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        Loading Dyna-MO PTM descriptor table...
      </div>
    </div>
  );
}

function compareRows(
  a: PublicSystem,
  b: PublicSystem,
  key: keyof PublicSystem,
  asc: boolean,
) {
  const av = a[key];
  const bv = b[key];
  const result =
    typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av ?? "").localeCompare(String(bv ?? ""));
  return asc ? result : -result;
}

function formatCell(value: unknown) {
  if (typeof value === "number")
    return Number.isInteger(value) ? value : value.toFixed(2);
  if (value === null || value === undefined || value === "") return "NA";
  return String(value);
}

function formatNumber(value: number | null, digits = 2, suffix = "") {
  if (value === null || Number.isNaN(value)) return "NA";
  return `${value.toFixed(digits)}${suffix}`;
}

function assetUrl(path: string) {
  return `${BASE}${path}`.replace(/\/{2,}/g, "/");
}

function withBase(path: string) {
  const base = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
  return `${base}${path}`;
}

function getRoutePath() {
  const base = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
  const pathname = window.location.pathname;
  const stripped =
    base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return stripped || "/";
}

function routeKey(path: string) {
  return path.replace("/", "") || "home";
}

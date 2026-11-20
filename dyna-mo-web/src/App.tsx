import { useVirtualizer } from "@tanstack/react-virtual";
import Fuse from "fuse.js";
import {
  Activity,
  BarChart3,
  BookOpen,
  Box,
  Database,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Menu,
  Search,
  Table2,
  X,
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

type DescriptorField = {
  field_name: string;
  field_index: string;
  descriptor_family: string;
  value_role: string;
  comparability_status: string;
  n_nonblank: string;
  availability_scope: string;
  aggregation_or_source: string;
  recommended_use: string;
  pooling_policy: string;
  missingness_policy: string;
};

const LITE_DOI = "10.5281/zenodo.22059934";
const FULL_DOI = "10.5281/zenodo.22049767";
const LITE_URL = `https://doi.org/${LITE_DOI}`;
const FULL_URL = `https://doi.org/${FULL_DOI}`;
const GITHUB_URL = "https://github.com/kkkniengLiu/dyna-mo-ptm-web";
const PREPRINT_DOI = "10.64898/2026.08.23.746532";
const PREPRINT_URL = `https://doi.org/${PREPRINT_DOI}`;

const DISPLAY_CITATION = `Liu K., Qian Q., Peng J., Ma D., Yao Y., Zhao J. & Chi Y. Molecular dynamics descriptors and retained starting structures for 1,079 post-translationally modified protein systems. Zenodo ${LITE_DOI} (2026).`;

const CITATION_TEXT: Record<CitationFormat, string> = {
  bibtex: `@dataset{liu2026dynamoptm,
  title   = {Molecular dynamics descriptors and retained starting structures for 1,079 post-translationally modified protein systems},
  author  = {Liu, Kaining and Qian, Qiuting and Peng, Jiahua and Ma, Dongge and Yao, Yifei and Zhao, Jingjing and Chi, Ying},
  publisher = {Zenodo},
  version = {0.3.1-lite},
  doi     = {${LITE_DOI}},
  url     = {${LITE_URL}},
  year    = {2026}
}`,
  ris: `TY  - DATA
ID  - liu2026dynamoptm
TI  - Molecular dynamics descriptors and retained starting structures for 1,079 post-translationally modified protein systems
AU  - Liu, Kaining
AU  - Qian, Qiuting
AU  - Peng, Jiahua
AU  - Ma, Dongge
AU  - Yao, Yifei
AU  - Zhao, Jingjing
AU  - Chi, Ying
DO  - ${LITE_DOI}
UR  - ${LITE_URL}
PB  - Zenodo
PY  - 2026
ER  -`,
  endnote: `%0 Dataset
%F liu2026dynamoptm
%T Molecular dynamics descriptors and retained starting structures for 1,079 post-translationally modified protein systems
%A Liu, Kaining
%A Qian, Qiuting
%A Peng, Jiahua
%A Ma, Dongge
%A Yao, Yifei
%A Zhao, Jingjing
%A Chi, Ying
%R ${LITE_DOI}
%U ${LITE_URL}
%I Zenodo
%D 2026`,
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
      : route === "/statistics"
        ? "statistics"
        : route === "/docs"
          ? "docs"
          : route === "/descriptors"
            ? "descriptors"
            : route === "/downloads"
              ? "downloads"
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
      <aside aria-label="Data version and correction notice" className="border-b border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-slate-950">
        <div className="mx-auto max-w-7xl">
          <strong>Historical data view.</strong>{" "}
          This browser displays the original v0.3.0 descriptors. Corrected local measurements and the conservative reuse subset are supplied separately in the analysis companion.
          <details className="mt-2">
            <summary className="cursor-pointer font-medium underline underline-offset-4">Corrections and reuse guidance · 14 November 2026</summary>
            <div className="mt-2 max-w-4xl space-y-2">
              <p>The current analysis corrects phosphorylation coordinate–box pairing and includes terminal carboxylates in methyl-K/R contact selections. It also records periodic-image, artificial-endpoint, sequence-identity and input-geometry review flags. Historical table values and figures on this website have not been replaced.</p>
              <p>The conservative selection contains 744 systems with three trajectories each. Its exported tables omit unvalidated PTM hydrogen-bond fields; the older diagnostic-only selection contains 988 systems. Membership reflects the specified screens and does not establish convergence or physical equivalence.</p>
              <p>The updated companion is in an unpublished validation record for manuscript review. Reviewers can access it through the private link supplied with the manuscript; public access will follow release. The original <a className="underline underline-offset-4" href={LITE_URL}>Lite record</a> and <a className="underline underline-offset-4" href={FULL_URL}>trajectory record</a> carry public correction notices.</p>
            </div>
          </details>
        </div>
      </aside>
      {page === "browse" ? (
        <BrowsePage dataset={dataset} navigate={navigate} />
      ) : page === "statistics" ? (
        <StatisticsPage dataset={dataset} />
      ) : page === "docs" ? (
        <DocsPage dataset={dataset} navigate={navigate} />
      ) : page === "descriptors" ? (
        <DescriptorDictionaryPage />
      ) : page === "downloads" ? (
        <DownloadsPage />
      ) : page === "about" ? (
        <AboutPage dataset={dataset} />
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
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { path: "/", label: "Overview" },
    { path: "/browse", label: "Browse" },
    { path: "/statistics", label: "Statistics" },
    { path: "/descriptors", label: "Descriptors" },
    { path: "/docs", label: "Docs" },
    { path: "/downloads", label: "Downloads" },
    { path: "/about", label: "About" },
  ];

  function follow(path: string) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-950/10 bg-[#10324a]/[0.96] text-white shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <button
          className="flex items-center gap-3 font-semibold"
          onClick={() => follow("/")}
        >
          <span className="grid h-9 w-9 place-items-center rounded-md bg-white text-sm font-bold text-[#10324a] shadow-sm">
            DM
          </span>
          <span className="hidden sm:inline">DynaMo PTM</span>
        </button>
        <nav className="hidden rounded-md border border-white/15 bg-white/[0.08] p-1 shadow-sm md:flex">
          {links.map((link) => (
            <a
              key={link.path}
              href={withBase(link.path)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                (
                  link.path === "/"
                    ? page === "home"
                    : routeKey(link.path.split("#")[0]) === page
                )
                  ? "bg-white text-[#10324a]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
              onClick={(event) => {
                event.preventDefault();
                follow(link.path);
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            className="hidden bg-[#0f766e] text-white hover:bg-[#0d665f] sm:inline-flex"
            onClick={() => follow("/browse")}
          >
            Browse database
          </Button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md border border-white/20 bg-white/10 md:hidden"
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav className="border-t border-white/15 bg-[#10324a] px-4 py-3 md:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2">
            {links.map((link) => (
              <a
                key={link.path}
                href={withBase(link.path)}
                className="rounded-md px-3 py-2 text-left text-sm text-slate-100 hover:bg-white/10"
                onClick={(event) => {
                  event.preventDefault();
                  follow(link.path);
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      ) : null}
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
              Descriptor schema v0.3.0 · Lite release v0.3.1
            </div>
            <div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.04] text-[#071827] md:text-6xl">
                DynaMo PTM
              </h1>
              <p className="mt-3 max-w-3xl text-2xl font-medium leading-9 text-[#17415a]">
                Molecular dynamics resource for post-translationally modified
                proteins.
              </p>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Browse {dataset.stats.systems.toLocaleString()} PTM protein
                systems across six chemistries, with per-system MD quality, site
                biophysics, local structural context and AF3 confidence
                descriptors.
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#10324a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2639]"
                onClick={() => navigate("/browse")}
              >
                Browse the database
                <Search className="h-4 w-4" />
              </button>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#10324a] shadow-sm transition hover:border-[#10324a]"
                href={LITE_URL}
                target="_blank"
                rel="noreferrer"
              >
                Lite record
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#10324a] shadow-sm transition hover:border-[#10324a]"
                href={FULL_URL}
                target="_blank"
                rel="noreferrer"
              >
                Full trajectories
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#10324a] shadow-sm transition hover:border-[#10324a]"
                onClick={() => navigate("/downloads")}
              >
                Download and cite
                <FileText className="h-4 w-4" />
              </button>
            </div>
            <div className="hidden grid-cols-1 gap-3 lg:grid lg:grid-cols-3">
              <ReleaseMetric
                label="Systems"
                value={dataset.stats.systems.toLocaleString()}
              />
              <ReleaseMetric
                label="Simulation"
                value={dataset.stats.total_simulation_us.toFixed(2) + " us"}
              />
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
          note={
            dataset.release.local_kr_structures +
            " K/R and " +
            dataset.release.local_phosphorylation_structures +
            " phosphorylation inputs"
          }
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
          text="Open retained AF3 input structures in the NGL viewer."
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
          text="Choose the Lite descriptor package or the full trajectory record."
          onClick={() => navigate("/downloads")}
        />
        <FeatureCommand
          index="04"
          icon={FileText}
          title="Cite resource"
          text="Copy the published Zenodo dataset citation in BibTeX, RIS or EndNote format."
          onClick={() => navigate("/downloads#citation")}
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="chromatic-card rounded-xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase text-slate-500">
                Citation export
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Cite DynaMo PTM</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Published Lite dataset record. Cite the full record as well when
                using trajectory files.
              </p>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-800">
                {DISPLAY_CITATION}
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
          <p className="mt-2 text-[9pt] leading-5 text-slate-500">
            The original resource is also described in our{" "}
            <a className="underline underline-offset-4" href={PREPRINT_URL}>
              bioRxiv preprint ({PREPRINT_DOI})
            </a>
            . Cite the dataset records for the data used.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="chromatic-card rounded-xl p-5">
          <h2 className="text-2xl font-semibold">Publication overview</h2>
          <p className="mt-3 leading-7 text-slate-600">
            DynaMo PTM covers acetyl-lysine, methyl-lysine, methyl-arginine,
            phospho-serine, phospho-threonine and phospho-tyrosine. Each row
            records its preparation and descriptor provenance. The documented
            production design targets three nominal 10 ns replicas under
            CHARMM36m, TIP3P and 310 K NPT conditions.
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
            src={assetUrl("figures/fig1_dataset_overview_v3.png")}
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
            note={
              dataset.release.local_kr_structures +
              " K/R and " +
              dataset.release.local_phosphorylation_structures +
              " phosphorylation inputs"
            }
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
      description: `DynaMo PTM descriptor row for ${system.uniprot} ${system.mod_residue}, a ${system.ptm_label} molecular dynamics system.`,
      isPartOf: {
        "@type": "Dataset",
        name: "DynaMo PTM",
      },
      keywords: [
        "post-translational modification",
        "molecular dynamics",
        system.ptm_label,
        system.uniprot,
      ],
      creator: {
        "@type": "Organization",
        name: "DynaMo PTM",
      },
      variableMeasured: Object.keys(system.raw),
      sameAs: [`https://www.uniprot.org/uniprotkb/${system.uniprot}`],
      distribution,
    });
    document.head.appendChild(script);
    document.title = `${system.id} | DynaMo PTM`;

    return () => {
      script.remove();
      document.title = previousTitle;
    };
  }, [system]);

  const provenanceItems = [
    ["System", system.id],
    ["UniProt", system.uniprot],
    ["PTM type", system.ptm_label],
    ["Modified site", system.mod_residue],
    ["Schema version", system.schema_version],
    ["Input CCD code", system.ccd_code],
  ];
  if (system.ptm_type === "methyl_R") {
    provenanceItems.push(
      ["Input component", system.input_component],
      ["MD residue", system.md_residue],
      ["Biological modification", system.biological_modification],
      ["RMMA source", system.rmma_source],
      ["Production route", "RM1 v0.3; CHARMM36m/TIP3P; NPT 310 K; 3 x 10 ns"],
      [
        "Global descriptor source",
        "GROMACS rep1 legacy QC; Gate2 three-rep; Gate2.5 core/inter-rep",
      ],
      [
        "Site descriptor source",
        "GROMACS rep1 site QC; Gate2 rep2 RM1 biophysics",
      ],
    );
  }
  provenanceItems.push(
    ["Row status", system.status],
    ["Release flag", system.final_flag],
    ["Replica count", system.raw.n_rep_ok || system.raw.n_reps || "3"],
  );

  const groups = [
    {
      title: "Provenance",
      items: provenanceItems,
    },
    {
      title: "Global QC",
      items: [
        [
          "Replicate 1 RMSD mean, final 20 frames",
          formatNumber(system.rmsd_equil_mean_A, 2, " A"),
        ],
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
        [
          "Ionic-contact proxy count",
          formatNumber(system.n_sb_contacts_mean, 2),
        ],
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
                ? "Retained AF3 input PDB available. The input-component residue is highlighted in the 3D viewer."
                : "Input PDB not retained in the v0.3.0 web bundle; the descriptor record remains available."}
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
            {system.zenodo_url ? (
              <a
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                href={system.zenodo_url}
                target="_blank"
                rel="noreferrer"
                title="Open the Full trajectory record on Zenodo"
              >
                Download trajectories
                <Download className="h-4 w-4" />
              </a>
            ) : (
              <span
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                title="The Full trajectory record is unavailable"
              >
                Full record unavailable
                <Download className="h-4 w-4" />
              </span>
            )}
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
                    This input PDB was not retained in the v0.3.0 web bundle.
                    The descriptor row remains available.
                  </p>
                  {system.zenodo_url ? (
                    <a
                      className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                      href={system.zenodo_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Full trajectory record
                    </a>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-slate-500">
                      Full trajectory record unavailable
                    </p>
                  )}
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
                      <dd
                        className="mt-1 break-words font-medium"
                        title={String(value || "NA")}
                      >
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

function StatisticsPage({ dataset }: { dataset: StaticDataset }) {
  const routeCounts = [
    {
      label: "K/R production route",
      value: dataset.systems.filter((system) => system.ptm_family === "K/R-PTM")
        .length,
      color: "#0f766e",
    },
    {
      label: "Phosphorylation archive route",
      value: dataset.systems.filter(
        (system) => system.ptm_family === "phosphorylation",
      ).length,
      color: "#7c3aed",
    },
  ];
  const lengthBins = [
    { label: "<200 aa", min: 0, max: 199 },
    { label: "200-399 aa", min: 200, max: 399 },
    { label: "400-799 aa", min: 400, max: 799 },
    { label: "800+ aa", min: 800, max: Number.POSITIVE_INFINITY },
  ].map((bin) => ({
    ...bin,
    value: dataset.systems.filter(
      (system) =>
        system.n_residues !== null &&
        system.n_residues >= bin.min &&
        system.n_residues <= bin.max,
    ).length,
  }));
  const maxPtm = Math.max(...dataset.stats.counts.map((item) => item.count));
  const maxLengthBin = Math.max(...lengthBins.map((item) => item.value));

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">
        Release statistics
      </p>
      <h1 className="mt-2 text-4xl font-semibold">Dataset overview</h1>
      <p className="mt-4 max-w-3xl leading-7 text-slate-600">
        Descriptive counts for the frozen schema v0.3.0 release. These summaries
        describe resource composition and availability; they are not estimates
        of PTM prevalence or modification effects.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatPanel label="Systems" value="1,079" />
        <StatPanel label="Completed replicas" value="3,237" />
        <StatPanel label="Aggregate sampling" value="32.37 μs" />
        <StatPanel label="Trajectory files" value="9,711" />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="chromatic-card rounded-xl p-6">
          <h2 className="text-2xl font-semibold">PTM composition</h2>
          <div className="mt-5 space-y-4">
            {dataset.stats.counts.map((item) => (
              <DistributionBar
                key={item.ptm_type}
                label={item.label}
                value={item.count}
                max={maxPtm}
                color={item.color}
              />
            ))}
          </div>
        </div>
        <div className="chromatic-card rounded-xl p-6">
          <h2 className="text-2xl font-semibold">Protein length</h2>
          <p className="mt-2 text-sm text-slate-500">
            Median retained length: {dataset.stats.median_length} amino acids.
          </p>
          <div className="mt-5 space-y-4">
            {lengthBins.map((item) => (
              <DistributionBar
                key={item.label}
                label={item.label}
                value={item.value}
                max={maxLengthBin}
                color="#17415a"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="chromatic-card rounded-xl p-6">
          <h2 className="text-2xl font-semibold">Production routes</h2>
          <div className="mt-5 space-y-4">
            {routeCounts.map((item) => (
              <DistributionBar
                key={item.label}
                label={item.label}
                value={item.value}
                max={dataset.stats.systems}
                color={item.color}
              />
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            The two routes share a 118-column schema but retain route-specific
            aggregation and QC provenance. Consult the descriptor dictionary
            before pooling fields.
          </p>
        </div>
        <div className="chromatic-card rounded-xl p-6">
          <h2 className="text-2xl font-semibold">Public structure coverage</h2>
          <p className="mt-4 text-4xl font-semibold text-[#10324a]">
            {dataset.stats.local_structures.toLocaleString()}
          </p>
          <p className="mt-2 leading-7 text-slate-600">
            Retained AF3 inputs are available for all 738 K/R systems and 180
            phosphorylation systems. The 161 unavailable batch-2 inputs are
            explicitly listed in the Lite record.
          </p>
        </div>
      </section>
    </main>
  );
}

function DocsPage({
  dataset,
  navigate,
}: {
  dataset: StaticDataset;
  navigate: (path: string) => void;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">
        Documentation
      </p>
      <h1 className="mt-2 text-4xl font-semibold">Use DynaMo PTM</h1>
      <p className="mt-4 max-w-3xl leading-7 text-slate-600">
        A practical route from dataset discovery to route-aware descriptor reuse
        and trajectory reanalysis.
      </p>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <ToolCard
          icon={Search}
          title="1. Find a system"
          text="Search by system ID or UniProt accession and filter by PTM class, length or dominant secondary structure."
        />
        <ToolCard
          icon={Table2}
          title="2. Check field compatibility"
          text="Read the field-level pooling policy before comparing K/R and phosphorylation routes."
        />
        <ToolCard
          icon={Download}
          title="3. Download the right record"
          text="Use the Lite record for descriptors and structures, and the Full record for XTC/TPR/GRO trajectories."
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="chromatic-card rounded-xl p-6">
          <h2 className="text-2xl font-semibold">Quick start</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-600">
            <li>
              Open the browser and select a system. Every system page exposes a
              stable JSON endpoint and, when available, an AF3 input structure.
            </li>
            <li>
              Use the descriptor dictionary to distinguish common,
              route-specific, context-only and non-harmonized fields.
            </li>
            <li>
              Download the Lite CSV for filtering or modelling. Use accession-
              aware splits and the provided <code>cv_fold</code> field.
            </li>
            <li>
              Download the Full record only when trajectory-level reanalysis is
              required; verify parts and files against the supplied manifests.
            </li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => navigate("/browse")}>Browse systems</Button>
            <Button variant="outline" onClick={() => navigate("/descriptors")}>
              Descriptor dictionary
            </Button>
          </div>
        </div>
        <div className="chromatic-card rounded-xl p-6">
          <h2 className="text-2xl font-semibold">Data architecture</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Definition
              label="Descriptor table"
              value={`${dataset.release.rows.toLocaleString()} rows × ${dataset.release.columns} columns`}
            />
            <Definition label="Static index" value="/api/systems.json" />
            <Definition label="System record" value="/api/system/<id>.json" />
            <Definition
              label="Compatibility API"
              value="/api/descriptor-compatibility.json"
            />
            <Definition label="Lite DOI" value={LITE_DOI} />
            <Definition label="Full DOI" value={FULL_DOI} />
          </dl>
        </div>
      </section>

      <section className="mt-8 chromatic-card rounded-xl p-6">
        <h2 className="text-2xl font-semibold">Interpretation boundaries</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <p className="leading-7 text-slate-600">
            The trajectories characterize finite-window relaxation from AF3-
            seeded starting structures. They do not establish equilibrium free
            energies, kinetic rates or modification effects without matched
            controls and longer sampling.
          </p>
          <p className="leading-7 text-slate-600">
            AF3 confidence fields describe the starting models. Associations
            between confidence and MD descriptors are descriptive and should not
            be interpreted as causal uncertainty propagation.
          </p>
        </div>
      </section>
    </main>
  );
}

function DescriptorDictionaryPage() {
  const [fields, setFields] = useState<DescriptorField[]>([]);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch(assetUrl("api/descriptor-compatibility.json"))
      .then((response) => {
        if (!response.ok)
          throw new Error("Failed to load descriptor dictionary");
        return response.json() as Promise<{ fields: DescriptorField[] }>;
      })
      .then((payload) => setFields(payload.fields))
      .catch(() => setLoadError(true));
  }, []);

  const families = useMemo(
    () => [...new Set(fields.map((field) => field.descriptor_family))].sort(),
    [fields],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return fields.filter(
      (field) =>
        (family === "all" || field.descriptor_family === family) &&
        (!needle ||
          [
            field.field_name,
            field.descriptor_family,
            field.recommended_use,
            field.comparability_status,
          ].some((value) => value.toLowerCase().includes(needle))),
    );
  }, [family, fields, query]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">
        Schema v0.3.0
      </p>
      <h1 className="mt-2 text-4xl font-semibold">Descriptor dictionary</h1>
      <p className="mt-4 max-w-4xl leading-7 text-slate-600">
        Definitions and pooling policies for all 118 fields. Prefer fields
        marked <strong>preferred_common</strong> for direct cross-route
        summaries; stratify route-specific fields and do not pool non-harmonized
        fields.
      </p>

      <section className="mt-7 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_280px_auto]">
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Search field, family or recommended use"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="rounded-md border px-3 py-2 text-sm"
          aria-label="Descriptor family"
          value={family}
          onChange={(event) => setFamily(event.target.value)}
        >
          <option value="all">All descriptor families</option>
          {families.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <span className="self-center text-sm text-slate-500">
          {filtered.length} / {fields.length || 118} fields
        </span>
      </section>

      {loadError ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Descriptor dictionary could not be loaded. Use the downloadable CSV.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-[1120px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Family</th>
                <th className="px-4 py-3">Compatibility</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">Recommended use</th>
                <th className="px-4 py-3">Pooling policy</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((field) => (
                <tr
                  key={field.field_name}
                  className="border-b align-top last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                    {field.field_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {field.descriptor_family.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <CompatibilityBadge value={field.comparability_status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {field.availability_scope.replaceAll("_", " ")}
                  </td>
                  <td className="max-w-sm px-4 py-3 leading-6 text-slate-600">
                    {field.recommended_use}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {field.pooling_policy.replaceAll("_", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function DownloadsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">
        Data access
      </p>
      <h1 className="mt-2 text-4xl font-semibold">Download and cite</h1>
      <p className="mt-4 max-w-3xl leading-7 text-slate-600">
        The release is split into a lightweight descriptor-and-structure record
        and a full trajectory record. Both are public under CC BY 4.0.
      </p>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <DownloadCard
          title="Lite record"
          version="v0.3.1-lite · schema v0.3.0"
          description="Master descriptor table, 118-field dictionary, 918 retained AF3 inputs, manifests, figures, source data and analysis scripts."
          doi={LITE_DOI}
          href={LITE_URL}
        />
        <DownloadCard
          title="Full trajectory record"
          version="v0.3.0-full · 133.70 GB"
          description="3,237 replicas and 9,711 XTC/TPR/GRO files, with part manifests, SHA-256 checks and independent integrity-audit evidence."
          doi={FULL_DOI}
          href={FULL_URL}
        />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <a
          className="feature-command"
          href={assetUrl("data/master_table_all_v2.csv")}
        >
          <Download className="h-5 w-5 text-[#0f766e]" />
          <h2 className="mt-4 text-lg font-semibold">Descriptor CSV</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            1,079 rows × 118 columns.
          </p>
        </a>
        <a className="feature-command" href={assetUrl("api/systems.json")}>
          <Database className="h-5 w-5 text-[#0f766e]" />
          <h2 className="mt-4 text-lg font-semibold">Static API index</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Searchable system metadata without a backend service.
          </p>
        </a>
        <a
          className="feature-command"
          href={PREPRINT_URL}
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen className="h-5 w-5 text-[#0f766e]" />
          <h2 className="mt-4 text-lg font-semibold">Public preprint</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Molecular dynamics descriptors for 1,079 post-translationally modified
            protein systems. bioRxiv (2026).
            <span className="mt-2 block">DOI: {PREPRINT_DOI}</span>
          </p>
        </a>
      </section>

      <section
        id="citation"
        className="mt-8 scroll-mt-24 chromatic-card rounded-xl p-6"
      >
        <h2 className="text-2xl font-semibold">Dataset citation</h2>
        <p className="mt-3 leading-7 text-slate-600">{DISPLAY_CITATION}</p>
        <pre className="mt-4 overflow-auto rounded-lg border bg-slate-950 p-4 text-sm leading-6 text-slate-100">
          {CITATION_TEXT.bibtex}
        </pre>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Cite the Full record in addition to the Lite record when trajectory
          files are used. For the original resource description, see the{" "}
          <a className="underline underline-offset-4" href={PREPRINT_URL}>
            bioRxiv preprint ({PREPRINT_DOI})
          </a>
          .
        </p>
      </section>
    </main>
  );
}

function AboutPage({ dataset }: { dataset: StaticDataset }) {
  const completionExceptions = dataset.systems.filter(
    (system) =>
      typeof system.sim_time_ns === "number" &&
      Math.abs(system.sim_time_ns - 10) > 0.01,
  ).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="chromatic-card rounded-xl p-6">
        <h1 className="text-4xl font-semibold">About DynaMo PTM</h1>
        <p className="mt-5 leading-8 text-slate-600">
          The DynaMo PTM descriptor schema v0.3.0 contains{" "}
          {dataset.stats.systems.toLocaleString()} modified-protein systems
          covering acetyl-lysine, methyl-lysine, methyl-arginine,
          phospho-serine, phospho-threonine and phospho-tyrosine. The resource
          follows a three-replica, nominal 10 ns design and provides a{" "}
          {dataset.release.columns}-column descriptor table with explicit
          route-level provenance.
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
            text="Lite v0.3.1 provides descriptors and structures; Full v0.3.0 provides trajectories."
          />
          <ToolCard
            icon={Filter}
            title="Licences"
            text="Data CC BY 4.0; repository code MIT."
          />
        </div>
        <h2 id="methods" className="mt-8 scroll-mt-24 text-2xl font-semibold">
          Methods
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          Retained AlphaFold 3 input structures are parameterised under the
          documented CHARMM36m and TIP3P workflow, whose production target is
          three nominal 10 ns replicas at 310 K. Methyl-arginine rows
          distinguish the AGM input component from the RM1 residue used during
          MD and record both global and site-level descriptor sources.
        </p>
        <h2 id="api" className="mt-8 scroll-mt-24 text-2xl font-semibold">
          Download and static API
        </h2>
        <div
          className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
          role="status"
        >
          Public deployment verified. The website serves descriptor schema
          v0.3.0, linked to Lite v0.3.1 and Full v0.3.0 Zenodo records.
          {completionExceptions > 0 ? (
            <>
              {" "}
              The completion-summary gate currently blocks{" "}
              {completionExceptions.toLocaleString()} inherited row; this build
              is not release-ready.
            </>
          ) : (
            <>
              {" "}
              The observed-file completion gate now covers all 1,079 released
              systems after the isolated O75792 rep-2 repair.
            </>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <StatPanel label="Release" value={dataset.release.version} compact />
          <StatPanel
            label="Descriptor table"
            value={
              dataset.release.rows.toLocaleString() +
              " x " +
              dataset.release.columns
            }
            compact
          />
          <StatPanel
            label="AF3 inputs"
            value={dataset.stats.local_structures.toLocaleString()}
            compact
          />
          <StatPanel
            label="Simulation"
            value={dataset.stats.total_simulation_us.toFixed(2) + " μs"}
            compact
          />
          <StatPanel
            label="API record"
            value={dataset.release.api_record_fields + " fields"}
            compact
          />
        </div>
        <p className="mt-3 leading-7 text-slate-600">
          The public static API mirrors the synchronized release. Its searchable
          index is{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">
            /api/systems.json
          </code>{" "}
          and full descriptor records use{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">
            /api/system/&lt;id&gt;.json
          </code>
          .
        </p>
        <p className="mt-3 leading-7 text-slate-600">
          Field compatibility is defined per descriptor rather than per system.
          Use the machine-readable companion before pooling values across the
          K/R and phosphorylation production routes. The AF3 association table
          is descriptive and does not represent causal uncertainty propagation.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a
            className="font-medium text-slate-800 underline underline-offset-4"
            href={assetUrl("data/descriptor_compatibility_v0.3.0.csv")}
          >
            Descriptor compatibility CSV
          </a>
          <a
            className="font-medium text-slate-800 underline underline-offset-4"
            href={assetUrl("data/af3_descriptor_associations_v0.3.0.csv")}
          >
            AF3 association CSV
          </a>
          <a
            className="font-medium text-slate-800 underline underline-offset-4"
            href={assetUrl("api/descriptor-compatibility.json")}
          >
            Compatibility JSON API
          </a>
        </div>
        <div className="mt-4 grid gap-3">
          <pre className="overflow-auto rounded-lg border bg-slate-950 p-4 text-sm leading-6 text-slate-100">
            {`Public release files (1079 records; 48 fields per index record)
public/api/systems.json
public/api/descriptor-compatibility.json
public/api/system/a6nhq2_k76_acetyl.json

Deployment endpoint
${dataset.release.site_url}/api/systems.json`}
          </pre>
          <p className="text-sm leading-6 text-slate-500">
            The deployment target passed an unauthenticated synchronization
            audit. These static JSON files require no backend service.
          </p>
        </div>
        <h2 id="faq" className="mt-8 scroll-mt-24 text-2xl font-semibold">
          FAQ
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          The web build contains {dataset.release.local_kr_structures} K/R-PTM
          and {dataset.release.local_phosphorylation_structures} phosphorylation
          input structures. The remaining 161 release systems retain descriptor
          pages but no bundled PDB.
        </p>
        <dl className="mt-4 grid gap-3">
          <div className="rounded-lg border bg-white/75 p-4">
            <dt className="font-semibold">How should I cite this resource?</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">
              Cite the published Lite dataset record ({LITE_DOI}). Cite the Full
              record ({FULL_DOI}) as well when using trajectories.
            </dd>
          </div>
          <div className="rounded-lg border bg-white/75 p-4">
            <dt className="font-semibold">How do I download trajectories?</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">
              Trajectories remain off-site to keep the web build lightweight.
              Use the Full Zenodo record, and follow its part manifests and
              SHA-256 checks when retrieving the 133.70 GB release.
            </dd>
          </div>
          <div className="rounded-lg border bg-white/75 p-4">
            <dt className="font-semibold">What is cv_fold?</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">
              The descriptor table preserves cross-validation fold annotations
              for reproducible downstream modelling and stratified analysis.
            </dd>
          </div>
          <div className="rounded-lg border bg-white/75 p-4">
            <dt className="font-semibold">
              How is DynaMo PTM related to ATLAS?
            </dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">
              ATLAS is a broad protein flexibility resource. DynaMo PTM is a
              PTM-focused complement with modified-residue descriptors and
              uniform short MD replicas.
            </dd>
          </div>
          <div className="rounded-lg border bg-white/75 p-4">
            <dt className="font-semibold">
              How is this different from PhosphoSitePlus?
            </dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">
              PhosphoSitePlus catalogues curated PTM sites and annotations.
              DynaMo PTM adds structure-based and MD-derived descriptors for
              simulated modified protein systems.
            </dd>
          </div>
        </dl>
        <h2 className="mt-8 text-2xl font-semibold">Dataset citation</h2>
        <p className="mt-3 leading-7 text-slate-600">{DISPLAY_CITATION}</p>
        <pre className="mt-3 overflow-auto rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
          {CITATION_TEXT.bibtex}
        </pre>
      </div>
    </main>
  );
}

function DistributionBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono text-slate-500">
          {value.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{
            width: `${max ? (value / max) * 100 : 0}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white/80 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 break-words font-mono text-sm text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function CompatibilityBadge({ value }: { value: string }) {
  const tone =
    value === "preferred_common"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : value === "route_specific"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : value === "not_harmonized"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-slate-200 bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function DownloadCard({
  title,
  version,
  description,
  doi,
  href,
}: {
  title: string;
  version: string;
  description: string;
  doi: string;
  href: string;
}) {
  return (
    <article className="chromatic-card rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm font-medium text-[#0f766e]">{version}</p>
        </div>
        <Download className="h-6 w-6 text-[#0f766e]" />
      </div>
      <p className="mt-4 leading-7 text-slate-600">{description}</p>
      <p className="mt-4 break-all font-mono text-sm text-slate-700">{doi}</p>
      <a
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#10324a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b2639]"
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        Open Zenodo record
        <ExternalLink className="h-4 w-4" />
      </a>
    </article>
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
            DynaMo PTM descriptor schema v0.3.0
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            A synchronized interface for the Lite v0.3.1 descriptor and AF3
            structure release, with links to Full v0.3.0 trajectories.
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
          text="918 retained AF3 inputs"
        />
        <MiniCapability icon={Table2} label="Descriptors" text="118 columns" />
        <MiniCapability
          icon={BarChart3}
          label="Figures"
          text="Manuscript assets"
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
        <span>DynaMo PTM · descriptor schema v0.3.0</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <a className="underline underline-offset-4" href={LITE_URL}>
            Lite {LITE_DOI}
          </a>
          <a className="underline underline-offset-4" href={FULL_URL}>
            Full {FULL_DOI}
          </a>
          <a className="underline underline-offset-4" href={GITHUB_URL}>
            Website source
          </a>
        </span>
      </div>
    </footer>
  );
}

function LoadingShell() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        Loading DynaMo PTM descriptor table...
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

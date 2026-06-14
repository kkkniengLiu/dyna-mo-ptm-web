"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import Fuse from "fuse.js";
import { ArrowDownUp, Download, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import type { SystemSummary } from "@/lib/schema";
import { ptmTypes } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { GlowCard } from "@/components/visual/GlowCard";
import { StatusPill } from "@/components/visual/StatusPill";

const columns: ColumnDef<SystemSummary>[] = [
  {
    accessorKey: "ptm_type",
    header: "PTM type",
    cell: ({ row }) => <Badge>{row.original.ptm_type}</Badge>,
  },
  {
    accessorKey: "uniprot_id",
    header: "UniProt",
    cell: ({ row }) => (
      <a
        className="font-medium text-primary underline-offset-4 hover:underline"
        href={`https://www.uniprot.org/uniprotkb/${row.original.uniprot_id.toUpperCase()}`}
        onClick={(event) => event.stopPropagation()}
        target="_blank"
        rel="noreferrer"
      >
        {row.original.uniprot_id.toUpperCase()}
      </a>
    ),
  },
  {
    accessorKey: "site",
    header: "Site",
    cell: ({ row }) => <span className="font-mono">{row.original.site}</span>,
  },
  {
    accessorKey: "n_residues",
    header: "Residues",
  },
  {
    accessorKey: "rmsd_equil_mean_A",
    header: "RMSD A",
    cell: ({ row }) => formatNumber(row.original.rmsd_equil_mean_A, 2),
  },
  {
    accessorKey: "rg_mean_A",
    header: "Rg A",
    cell: ({ row }) => formatNumber(row.original.rg_mean_A, 2),
  },
  {
    accessorKey: "plddt_mean",
    header: "pLDDT",
    cell: ({ row }) => formatNumber(row.original.plddt_mean, 1),
  },
  {
    accessorKey: "site_ss_dominant",
    header: "Site SS",
  },
  {
    accessorKey: "burial_class",
    header: "Burial",
  },
];

type SystemTableProps = {
  systems: SystemSummary[];
  initialQuery: string;
  initialPtm: string[];
  initialBurial: string[];
  initialSiteSs: string[];
};

export function SystemTable({
  systems,
  initialQuery,
  initialPtm,
  initialBurial,
  initialSiteSs,
}: SystemTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [ptmFilter, setPtmFilter] = useState(initialPtm);
  const [burialFilter, setBurialFilter] = useState(initialBurial);
  const [siteSsFilter, setSiteSsFilter] = useState(initialSiteSs);
  const [sorting, setSorting] = useState<SortingState>([]);

  const burialOptions = useMemo(
    () => uniqueValues(systems.map((system) => system.burial_class)),
    [systems],
  );
  const ssOptions = useMemo(
    () => uniqueValues(systems.map((system) => system.site_ss_dominant)),
    [systems],
  );

  const filteredSystems = useMemo(() => {
    let rows = systems;

    if (ptmFilter.length > 0) {
      rows = rows.filter((system) => ptmFilter.includes(system.ptm_type));
    }
    if (burialFilter.length > 0) {
      rows = rows.filter((system) =>
        burialFilter.includes(system.burial_class),
      );
    }
    if (siteSsFilter.length > 0) {
      rows = rows.filter((system) =>
        siteSsFilter.includes(system.site_ss_dominant),
      );
    }
    if (query.trim()) {
      const fuse = new Fuse(rows, {
        threshold: 0.32,
        keys: ["protein_name", "uniprot_id", "site", "ptm_type"],
      });
      rows = fuse.search(query.trim()).map((result) => result.item);
    }

    return rows;
  }, [burialFilter, ptmFilter, query, siteSsFilter, systems]);

  const table = useReactTable({
    data: filteredSystems,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (ptmFilter.length > 0) {
      params.set("ptm", ptmFilter.join(","));
    }
    if (burialFilter.length > 0) {
      params.set("burial", burialFilter.join(","));
    }
    if (siteSsFilter.length > 0) {
      params.set("ss", siteSsFilter.join(","));
    }

    const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [burialFilter, pathname, ptmFilter, query, router, siteSsFilter]);

  function navigateTo(system: SystemSummary) {
    router.push(
      `/system/${encodeURIComponent(system.ptm_type)}/${encodeURIComponent(
        system.protein_name,
      )}`,
    );
  }

  function exportCsv() {
    const rows = table.getSortedRowModel().rows.map((row) => row.original);
    const csv = toCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "dyna-mo-ptm-current-view.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <GlowCard className="glass-panel p-4">
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <StatusPill className="shrink-0">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </StatusPill>
              <label className="relative block w-full lg:max-w-lg">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Global search</span>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="border-border/80 bg-background/70 pl-9 shadow-inner"
                  placeholder="Search UniProt, protein name, site, PTM"
                />
              </label>
            </div>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export current view as CSV
            </Button>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <ToggleFilter
              label="PTM type"
              options={ptmTypes}
              selected={ptmFilter}
              onChange={setPtmFilter}
            />
            <ToggleFilter
              label="Burial class"
              options={burialOptions}
              selected={burialFilter}
              onChange={setBurialFilter}
            />
            <ToggleFilter
              label="Site SS"
              options={ssOptions}
              selected={siteSsFilter}
              onChange={setSiteSsFilter}
            />
          </div>
        </div>
      </GlowCard>

      <div className="overflow-hidden rounded-lg border bg-card/92 shadow-xl shadow-foreground/[0.04]">
        <Table>
          <TableHeader className="sticky top-16 z-10 bg-card/95 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="border-b bg-muted/32">
                    {header.isPlaceholder ? null : (
                      <button
                        className="inline-flex items-center gap-1 text-left text-xs uppercase tracking-[0.08em]"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <ArrowDownUp className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-testid={index === 0 ? "system-row-0" : undefined}
                  className="cursor-pointer bg-card transition-colors hover:bg-primary/5 focus-visible:bg-primary/5"
                  tabIndex={0}
                  onClick={() => navigateTo(row.original)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      navigateTo(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-b border-border/60"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No systems match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card/70 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {table.getRowModel().rows.length} of {filteredSystems.length}{" "}
          filtered systems, {systems.length} total.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-md border border-primary/10 bg-primary/8 px-2 py-1 text-xs font-medium text-primary">
      {children}
    </span>
  );
}

function ToggleFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-lg border bg-background/52 p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              type="button"
              key={option}
              aria-pressed={active}
              onClick={() => toggleOption(option, selected, onChange)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-background/80 hover:-translate-y-px hover:bg-muted",
              )}
            >
              {option}
            </button>
          );
        })}
        {selected.length > 0 ? (
          <button
            type="button"
            className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}

function toggleOption(
  option: string,
  selected: string[],
  onChange: (next: string[]) => void,
) {
  if (selected.includes(option)) {
    onChange(selected.filter((item) => item !== option));
    return;
  }

  onChange([...selected, option]);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function toCsv(rows: SystemSummary[]) {
  const headers = [
    "ptm_type",
    "protein_name",
    "uniprot_id",
    "site",
    "n_residues",
    "rmsd_equil_mean_A",
    "rg_mean_A",
    "plddt_mean",
    "site_ss_dominant",
    "burial_class",
  ] as const;

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) =>
          csvEscape(row[header] === null ? "" : String(row[header])),
        )
        .join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

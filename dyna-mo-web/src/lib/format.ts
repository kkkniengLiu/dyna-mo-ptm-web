export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "NA";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export function slugLabel(value: string) {
  return value.replaceAll("_", " ");
}

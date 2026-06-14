import { describe, expect, it } from "vitest";

import { formatNumber, slugLabel } from "@/lib/format";

describe("format helpers", () => {
  it("formats nullable numbers", () => {
    expect(formatNumber(null)).toBe("NA");
    expect(formatNumber(1.234, 2)).toBe("1.23");
  });

  it("converts slug labels", () => {
    expect(slugLabel("methyl_R")).toBe("methyl R");
  });
});

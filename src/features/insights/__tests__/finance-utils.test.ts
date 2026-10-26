import { describe, expect, it } from "vitest";
import { chartToCsv, extractFindings } from "../finance-utils";

describe("finance chart CSV", () => {
  it("exports only ISO dates and numeric values without currency conversion", () => {
    expect(chartToCsv([{ date: "2026-10-26", primary: 100.25, secondary: -2.5 }], "Sales", "Refunds"))
      .toBe('"Date","Sales","Refunds"\r\n"2026-10-26",100.25,-2.5\r\n');
  });

  it("quotes labels safely and neutralizes spreadsheet formulas", () => {
    const result = chartToCsv([{ date: "=BAD()", primary: Number.NaN, secondary: 0 }], '=IMPORT("x")', "Refunds");
    expect(result).toContain('"\'=IMPORT(""x"")"');
    expect(result).toContain('"",,0');
    expect(result).not.toContain('=BAD()');
  });
});

describe("auditing report extraction", () => {
  it("returns empty rows for an absent legacy findings object", () => {
    expect(extractFindings({ version: 1 })).toEqual([]);
  });
  it("respects check counts and samples", () => {
    expect(extractFindings({ findings: {
      missing_credit: { count: 2, sample_allocation_ids: [5, 7] },
      all_clear: { count: 0, sample_ids: [] },
    } })).toEqual([
      { code: "missing_credit", count: 2, samples: "5, 7" },
      { code: "all_clear", count: 0, samples: "" },
    ]);
  });
});

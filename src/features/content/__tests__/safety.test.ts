import { describe, expect, it } from "vitest";
import { safeContentUrl, toDateTimeLocal, toIsoDateTime } from "../safety";

describe("CMS URL security", () => {
  it("accepts relative and https links", () => {
    expect(safeContentUrl("/products")).toBe("/products");
    expect(safeContentUrl("https://example.com/about")).toBe("https://example.com/about");
  });
  it.each(["javascript:alert(1)", "data:text/html,test", "//evil.example", "\\\\evil.example", "mailto:test@example.com", "", "\n/evil"]) ("rejects unsafe link %s", (url) => {
    expect(safeContentUrl(url)).toBeNull();
  });
});
describe("CMS schedule helpers", () => {
  it("converts local datetime to UTC ISO", () => {
    expect(toIsoDateTime("2026-10-28T10:45")).toMatch(/^2026-10-28T\d{2}:45:00\.000Z$/);
  });
  it("can format a datetime for an input", () => {
    expect(toDateTimeLocal("2026-10-28T10:45:00Z")).toMatch(/^2026-10-28T\d{2}:45$/);
  });
  it("ignores invalid dates", () => {
    expect(toIsoDateTime("bad")).toBeNull();
    expect(toDateTimeLocal(null)).toBe("");
  });
});

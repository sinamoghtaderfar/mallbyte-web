import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinancialNav } from "../financial-nav";

const path = vi.hoisted(() => ({ current: "/admin/monitoring" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.current }));

describe("financial workspace navigation", () => {
  it("links all protected finance pages and marks the active page", () => {
    render(<FinancialNav />);
    expect(screen.getByRole("navigation", { name: "Financial workspace" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/admin/financial");
    expect(screen.getByRole("link", { name: "Audit monitoring" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Reconciliation" }).getAttribute("aria-current")).toBeNull();
  });
});

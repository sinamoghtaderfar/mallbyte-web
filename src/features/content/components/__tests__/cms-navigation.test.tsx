import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPublicNavigation } from "../../api";
import type { NavigationItem, NavigationMenu } from "../../types";
import { CmsFooter } from "../cms-footer";
import { CmsNavLinks } from "../cms-nav-links";

vi.mock("../../api", () => ({ fetchPublicNavigation: vi.fn() }));
const fetchNavigation = vi.mocked(fetchPublicNavigation);
function item(id: number, overrides: Partial<NavigationItem> = {}): NavigationItem {
  return { id, menu: 1, parent: null, label: `Link ${id}`, url: `/pages/link-${id}`,
    link_url: `/pages/link-${id}`, page: null, page_slug: null, page_title: null,
    icon: "", is_active: true, requires_auth: false, open_in_new_tab: false,
    order: id, children: [], ...overrides };
}
function menu(items: NavigationItem[], overrides: Partial<NavigationMenu> = {}): NavigationMenu {
  return { id: 1, name: "Public links", slug: "public-links", placement: "header",
    is_active: true, order: 1, items, ...overrides };
}

describe("public CMS navigation hierarchy", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("renders published descendants on desktop even when their parent is a built-in link", async () => {
    fetchNavigation.mockResolvedValue([menu([
      item(1, { label: "Products", url: "/products", children: [item(2, { parent: 1, label: "Featured products" })] }),
      item(3, { children: [item(4, { parent: 3 })] }), item(5),
    ])]);
    render(<nav aria-label="CMS header"><CmsNavLinks /></nav>);
    const nav = screen.getByRole("navigation", { name: "CMS header" });
    expect(await within(nav).findByRole("link", { name: "Featured products" })).toHaveAttribute("href", "/pages/link-2");
    expect(within(nav).queryByRole("link", { name: "Products" })).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Link 4" })).toHaveAttribute("href", "/pages/link-4");
    expect(within(nav).getByRole("link", { name: "Link 5" })).toBeInTheDocument();
    expect(fetchNavigation).toHaveBeenCalledWith("header");
  });

  it("renders every returned mobile child and calls onNavigate for keyboard activation", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    fetchNavigation.mockResolvedValue([menu([item(1, {
      children: Array.from({ length: 21 }, (_, index) => item(index + 2, { parent: 1 })),
    })], { placement: "mobile" })]);
    render(<nav aria-label="CMS mobile"><CmsNavLinks mobile onNavigate={onNavigate} /></nav>);
    const last = await screen.findByRole("link", { name: "Link 22" });
    expect(screen.getAllByRole("link")).toHaveLength(22);
    last.focus();
    await user.keyboard("{Enter}");
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(fetchNavigation).toHaveBeenCalledWith("mobile");
  });

  it("keeps invisible and authentication-only branches hidden and rejects unsafe child URLs", async () => {
    fetchNavigation.mockResolvedValue([
      menu([item(1, { is_active: false, children: [item(2)] }),
        item(3, { requires_auth: true, children: [item(4)] }),
        item(5, { children: [item(6, { is_active: false }), item(7, { requires_auth: true }),
          item(8, { url: "javascript:alert(1)" }), item(9, { url: "//untrusted.example/path" }),
          item(10, { label: "External child", url: "https://example.com/docs", open_in_new_tab: true })] }),
      ]), menu([item(11)], { id: 2, is_active: false }),
    ]);
    render(<CmsNavLinks />);
    const external = await screen.findByRole("link", { name: "External child" });
    expect(external).toHaveAttribute("href", "https://example.com/docs");
    expect(external).toHaveAttribute("target", "_blank");
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Link 5", "External child"]);
  });

  it("renders nested footer links and retains safe external link attributes", async () => {
    fetchNavigation.mockResolvedValue([menu([item(1, { label: "Company", children: [
      item(2, { parent: 1, label: "Terms", url: "/pages/terms" }),
      item(3, { parent: 1, label: "Documentation", url: "https://example.com/guide", open_in_new_tab: true }),
    ] })], { placement: "footer" })]);
    render(<CmsFooter />);
    const footer = screen.getByRole("navigation", { name: "Footer links" });
    expect(await within(footer).findByRole("link", { name: "Terms" })).toHaveAttribute("href", "/pages/terms");
    expect(within(footer).getByRole("link", { name: "Documentation" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(fetchNavigation).toHaveBeenCalledWith("footer");
  });

  it("keeps the fallback footer after a public navigation failure", async () => {
    fetchNavigation.mockRejectedValue(new Error("Offline"));
    render(<CmsFooter />);
    expect(await screen.findByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/support");
  });

  it("ignores header responses superseded by mobile navigation", async () => {
    let resolveHeader!: (value: NavigationMenu[]) => void;
    fetchNavigation.mockReturnValueOnce(new Promise((resolve) => { resolveHeader = resolve; }))
      .mockResolvedValueOnce([menu([item(2, { label: "Current mobile" })])]);
    const { rerender } = render(<CmsNavLinks />);
    rerender(<CmsNavLinks mobile />);
    await screen.findByRole("link", { name: "Current mobile" });
    await act(async () => resolveHeader([menu([item(1, { label: "Obsolete desktop" })])]));
    expect(screen.queryByRole("link", { name: "Obsolete desktop" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Current mobile" })).toBeInTheDocument();
  });
});

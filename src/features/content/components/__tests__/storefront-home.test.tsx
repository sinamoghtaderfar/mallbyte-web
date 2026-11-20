import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublicHomepage } from "../../api";
import type { ContentBanner, HomepageContent } from "../../types";
import { StorefrontHome } from "../storefront-home";

vi.mock("../../api", () => ({ fetchPublicHomepage: vi.fn() }));
const fetchHome = vi.mocked(fetchPublicHomepage);
const empty: HomepageContent = {
  banners: [],
  announcements: [],
  featured_pages: [],
  featured_faqs: [],
};
const hero: ContentBanner = {
  id: 1,
  title: "Made for everyday",
  subtitle: "Meet independent makers.",
  placement: "home_hero",
  image: "/media/hero.jpg",
  mobile_image: "/media/hero-mobile.jpg",
  cta_text: "Meet the collection",
  link_url: "https://example.test/collection",
  background_color: "#edf8f9",
  text_color: "#17252f",
  is_clickable: true,
  order: 0,
  status: "published",
  published_at: null,
  starts_at: null,
  ends_at: null,
  is_visible: true,
};
beforeEach(() => {
  vi.resetAllMocks();
  fetchHome.mockResolvedValue(empty);
});

describe("storefront discovery and published content", () => {
  it("keeps shopping available when optional homepage content fails", async () => {
    fetchHome.mockRejectedValue(new Error("Offline"));
    render(<StorefrontHome />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Storefront extras are temporarily unavailable",
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Explore products" }),
    ).toHaveAttribute("href", "/products");
    const discovery = screen.getByRole("navigation", {
      name: "Discover collections",
    });
    expect(
      within(discovery).getByRole("link", { name: /New arrivals/ }),
    ).toHaveAttribute("href", "/products?label=new");
    expect(
      within(discovery).getByRole("link", { name: /Bestsellers/ }),
    ).toHaveAttribute("href", "/products?label=bestseller");
  });

  it("retains visible CMS hero, announcement, pages and FAQs with safe external links", async () => {
    fetchHome.mockResolvedValue({
      ...empty,
      banners: [
        hero,
        { ...hero, id: 2, title: "Hidden promotion", is_visible: false },
      ],
      announcements: [
        {
          id: 5,
          title: "Marketplace news",
          message: "Meet the latest stores.",
          level: "info",
          placement: "home",
          link_url: "https://example.test/news",
          link_text: "Read the news",
          is_dismissible: false,
          order: 0,
          is_visible: true,
          status: "published",
          published_at: null,
          starts_at: null,
          ends_at: null,
        },
      ],
      featured_pages: [
        {
          id: 10,
          title: "Our story",
          slug: "our-story",
          page_type: "about",
          excerpt: "Built around independent stores.",
          content: "",
          is_featured: true,
          order: 0,
          meta_title: "",
          meta_description: "",
          meta_keywords: "",
          is_visible: true,
          status: "published",
          published_at: null,
          starts_at: null,
          ends_at: null,
        },
      ],
      featured_faqs: [
        {
          id: 20,
          category: 1,
          category_name: "Orders",
          question: "Where are my orders?",
          answer: "Open your account orders.",
          is_active: true,
          is_featured: true,
          order: 0,
        },
      ],
    });
    render(<StorefrontHome />);
    await screen.findByRole("heading", { level: 1, name: hero.title });
    const cta = screen.getByRole("link", { name: "Meet the collection" });
    expect(cta).toHaveAttribute("href", "https://example.test/collection");
    expect(cta).toHaveAttribute("rel", "noopener noreferrer");
    expect(cta).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("img", { name: hero.title })).toHaveAttribute(
      "src",
      "/media/hero.jpg",
    );
    expect(document.querySelector("source")).toHaveAttribute(
      "srcset",
      "/media/hero-mobile.jpg",
    );
    expect(screen.getByRole("link", { name: "Read the news" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("link", { name: /Our story/ })).toHaveAttribute(
      "href",
      "/pages/our-story",
    );
    expect(screen.getByText("Where are my orders?")).toBeInTheDocument();
    expect(screen.queryByText("Hidden promotion")).not.toBeInTheDocument();
  });

  it("rejects unsafe CMS media/links and respects a non-clickable hero", async () => {
    fetchHome.mockResolvedValue({
      ...empty,
      banners: [
        {
          ...hero,
          image: "javascript:alert(1)",
          link_url: "javascript:alert(1)",
          is_clickable: false,
        },
      ],
    });
    render(<StorefrontHome />);
    await screen.findByRole("heading", { name: hero.title });
    expect(
      screen.queryByRole("link", { name: "Meet the collection" }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[src^="javascript:"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[href^="javascript:"]'),
    ).not.toBeInTheDocument();
  });
});

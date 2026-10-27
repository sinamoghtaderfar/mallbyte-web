import type { CmsRecord, CmsResource } from "./types";

export type FieldType = "text" | "textarea" | "select" | "number" | "boolean" | "datetime" | "image" | "relation" | "color";
export type Field = {
  name: string; label: string; type: FieldType; required?: boolean;
  choices?: readonly string[]; relation?: CmsResource; help?: string;
};
export type ResourceDefinition = {
  title: string; singular: string; description: string;
  columns: readonly string[]; fields: Field[]; publishable?: boolean;
  routeKey: (row: CmsRecord) => number | string;
};
const primaryKey = (r: CmsRecord) => r.id;
const slugKey = (r: CmsRecord) => String(r.slug ?? r.id);
const orderField: Field = { name: "order", label: "Display order", type: "number" };
const activeField: Field = { name: "is_active", label: "Active (requires publishing rights)", type: "boolean" };
const schedule: Field[] = [
  { name: "starts_at", label: "Visible from", type: "datetime" },
  { name: "ends_at", label: "Visible until", type: "datetime" },
];
export const CMS_RESOURCES: Record<CmsResource, ResourceDefinition> = {
  pages: {
    title: "Content pages", singular: "Page", description: "About, policies and custom informational pages.",
    columns: ["title", "page_type", "status", "is_visible", "updated_at"], publishable: true, routeKey: slugKey,
    fields: [
      { name: "title", label: "Page title", type: "text", required: true },
      { name: "slug", label: "URL slug (generated if left blank)", type: "text" },
      { name: "page_type", label: "Page type", type: "select", choices: ["about", "terms", "privacy", "help", "landing", "custom"] },
      { name: "excerpt", label: "Short description", type: "textarea" },
      { name: "content", label: "Page content (plain text)", type: "textarea", required: true, help: "HTML is not executed. Use paragraphs separated by line breaks." },
      { name: "is_featured", label: "Featured on homepage", type: "boolean" },
      orderField, ...schedule,
      { name: "meta_title", label: "SEO title", type: "text" },
      { name: "meta_description", label: "SEO description", type: "textarea" },
      { name: "meta_keywords", label: "SEO keywords", type: "text" },
    ],
  },
  banners: {
    title: "Banners", singular: "Banner", description: "Responsive campaign artwork for the storefront.",
    columns: ["title", "placement", "status", "is_visible", "updated_at"], publishable: true, routeKey: primaryKey,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "textarea" },
      { name: "image", label: "Desktop image", type: "image", help: "JPEG, PNG or WebP; max 8 MB. Required when creating." },
      { name: "mobile_image", label: "Optional mobile image", type: "image" },
      { name: "placement", label: "Placement", type: "select", choices: ["home_hero", "home_top", "home_middle", "category_top", "product_detail", "checkout", "global"] },
      { name: "cta_text", label: "Button label", type: "text" },
      { name: "link_url", label: "Button link", type: "text", help: "Relative path or https:// URL." },
      { name: "background_color", label: "Background color (#RRGGBB)", type: "color" },
      { name: "text_color", label: "Text color (#RRGGBB)", type: "color" },
      { name: "is_clickable", label: "Clickable", type: "boolean" }, orderField, ...schedule,
    ],
  },
  "faq-categories": {
    title: "FAQ categories", singular: "FAQ category", description: "Organize customer help topics.",
    columns: ["name", "slug", "is_active", "order"], routeKey: slugKey,
    fields: [
      { name: "name", label: "Category name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" }, activeField, orderField,
    ],
  },
  faqs: {
    title: "FAQ questions", singular: "FAQ item", description: "Answer common customer questions.",
    columns: ["question", "category_name", "is_active", "is_featured", "order"], routeKey: primaryKey,
    fields: [
      { name: "category", label: "Category", type: "relation", relation: "faq-categories", required: true },
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Answer (plain text)", type: "textarea", required: true },
      activeField,
      { name: "is_featured", label: "Featured on homepage", type: "boolean" }, orderField,
    ],
  },
  announcements: {
    title: "Announcements", singular: "Announcement", description: "Important news and contextual notices.",
    columns: ["title", "placement", "level", "status", "is_visible"], publishable: true, routeKey: primaryKey,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "message", label: "Message", type: "textarea", required: true },
      { name: "level", label: "Style", type: "select", choices: ["info", "success", "warning", "danger"] },
      { name: "placement", label: "Placement", type: "select", choices: ["global", "home", "product", "checkout", "account"] },
      { name: "link_text", label: "Link label", type: "text" },
      { name: "link_url", label: "Link URL", type: "text" },
      { name: "is_dismissible", label: "Dismissible", type: "boolean" }, orderField, ...schedule,
    ],
  },
  navigation: {
    title: "Navigation menus", singular: "Menu", description: "Configure menus for header, footer and mobile.",
    columns: ["name", "slug", "placement", "is_active", "order"], routeKey: slugKey,
    fields: [
      { name: "name", label: "Menu name", type: "text", required: true },
      { name: "placement", label: "Placement", type: "select", choices: ["header", "footer", "mobile", "help", "account"] },
      activeField, orderField,
    ],
  },
  "navigation-items": {
    title: "Navigation items", singular: "Menu item", description: "Manage parent/child links, page references and order.",
    columns: ["label", "menu", "parent", "page_title", "is_active"], routeKey: primaryKey,
    fields: [
      { name: "menu", label: "Menu", type: "relation", relation: "navigation", required: true },
      { name: "parent", label: "Parent (optional; only two levels)", type: "relation", relation: "navigation-items" },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "link_url", label: "Link URL (overrides selected page)", type: "text" },
      { name: "page", label: "Internal content page", type: "relation", relation: "pages" },
      { name: "icon", label: "Icon name", type: "text" },
      activeField,
      { name: "requires_auth", label: "Requires sign-in", type: "boolean" },
      { name: "open_in_new_tab", label: "Open in new tab", type: "boolean" }, orderField,
    ],
  },
};
export const RESOURCE_ORDER: CmsResource[] = ["pages", "banners", "faq-categories", "faqs", "announcements", "navigation", "navigation-items"];
export function recordLabel(resource: CmsResource, row: CmsRecord): string {
  return String(row.title ?? row.name ?? row.question ?? row.label ?? row.slug ?? `#${row.id}`);
}

import {
  Activity, BarChart3, BookOpen, Boxes, CircleDollarSign, ClipboardList, Crown, FileSearch, Gauge, HeartHandshake,
  LayoutDashboard, LineChart, Package, PackageCheck, PackagePlus, RotateCcw, Settings2, ShieldAlert, Store, Truck, Warehouse, Workflow,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceLink = { href: string; label: string; icon: LucideIcon; exact?: boolean; superOnly?: boolean };
export type WorkspaceGroup = { label: string; links: WorkspaceLink[] };

export const SELLER_NAV: WorkspaceGroup[] = [
  { label: "Store", links: [
    { href: "/seller/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/seller/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/seller/finance", label: "Finance", icon: CircleDollarSign },
  ] },
  { label: "Catalog", links: [
    { href: "/seller/products", label: "Products", icon: Package },
    { href: "/seller/products/new", label: "Add product", icon: PackagePlus, exact: true },
  ] },
  { label: "Fulfilment", links: [
    { href: "/seller/orders", label: "Orders", icon: ClipboardList },
    { href: "/seller/returns", label: "Returns", icon: RotateCcw },
  ] },
  { label: "Settings", links: [
    { href: "/seller/store", label: "Store settings", icon: Settings2 },
  ] },
];

export const ADMIN_NAV: WorkspaceGroup[] = [
  { label: "Operations", links: [
    { href: "/admin", label: "Control center", icon: Gauge, exact: true },
    { href: "/admin/orders", label: "Orders", icon: ClipboardList },
    { href: "/admin/returns", label: "Returns", icon: PackageCheck },
    { href: "/admin/shipments", label: "Shipments", icon: Truck },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    { href: "/warehouse/transfers", label: "Stock transfers", icon: Warehouse },
    { href: "/admin/sellers", label: "Sellers", icon: HeartHandshake },
  ] },
  { label: "Finance", links: [
    { href: "/admin/financial", label: "Financial overview", icon: CircleDollarSign },
    { href: "/admin/analytics", label: "Cash-flow analytics", icon: LineChart },
    { href: "/admin/finance", label: "Reconciliation", icon: FileSearch },
    { href: "/admin/monitoring", label: "Audit monitoring", icon: Activity },
  ] },
  { label: "Platform", links: [
    { href: "/admin/content", label: "Content & CMS", icon: BookOpen },
    { href: "/admin/observability", label: "Observability", icon: ShieldAlert, exact: true },
    { href: "/admin/observability/workflows", label: "Ops workflows", icon: Workflow },
    { href: "/admin/super", label: "Super admin", icon: Crown, superOnly: true },
  ] },
];

const SELLER_PREFIXES = ["/seller/dashboard", "/seller/products", "/seller/orders", "/seller/returns", "/seller/store", "/seller/analytics", "/seller/finance"];
const ACCOUNT_PREFIXES = ["/profile", "/orders", "/wishlist", "/addresses", "/returns", "/notifications", "/support", "/recently-viewed"];

function under(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function workspaceFor(pathname: string): "seller" | "admin" | "account" | null {
  if (SELLER_PREFIXES.some((p) => under(pathname, p))) return "seller";
  if (under(pathname, "/admin") || under(pathname, "/warehouse")) return "admin";
  if (ACCOUNT_PREFIXES.some((p) => under(pathname, p))) return "account";
  return null;
}

/** The most specific matching link wins, so nested routes mark exactly one destination. */
export function activeWorkspaceHref(pathname: string, groups: WorkspaceGroup[]) {
  let best: string | null = null;
  for (const group of groups) for (const link of group.links) {
    const match = link.exact ? pathname === link.href : under(pathname, link.href);
    if (match && (!best || link.href.length > best.length)) best = link.href;
  }
  if (!best && pathname.startsWith("/admin/observability")) best = "/admin/observability";
  return best;
}

export { Store };

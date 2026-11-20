"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, Boxes, ClipboardList, CreditCard, HeartHandshake, History,
  KeyRound, LayoutDashboard, LoaderCircle, Lock, Package, RefreshCcw, Search, Settings, Shield, ShieldCheck,
  Store, UserCog, Users, X,
} from "lucide-react";

import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableFrame } from "@/components/ui/data-display";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SegmentedNav, type SegmentItem } from "@/components/ui/segmented-nav";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "@/features/auth/components/access-denied";
import { apiClient } from "@/lib/api/client";

import { AuditLogCollection } from "./audit-log-collection";
import { ProductModerationCollection } from "./product-moderation-collection";

type Paginated<T> = { count: number; results: T[]; next: string | null; previous: string | null };
type Overview = {
  users: number; active_users: number; sellers: number; pending_sellers: number; products: number;
  pending_products: number; orders: number; open_tickets: number; roles: number; recent_admin_actions: number;
};
type User = {
  id: number; email: string; full_name: string; phone: string | null; is_active: boolean; is_staff: boolean;
  is_superuser: boolean; is_seller: boolean; email_verified: boolean; date_joined: string; roles: { id: number; name: string }[];
};
type Permission = { id: number; name: string; codename: string; module: string };
type Role = {
  id: number; name: string; description: string; level: number; is_system_role: boolean;
  permissions: string[]; permissions_count: number;
};
type Tab = "overview" | "users" | "roles" | "products" | "audit" | "settings";
type PendingAction =
  | { kind: "status"; user: User }
  | { kind: "remove-role"; user: User; role: { id: number; name: string } };

const base = "/api/rbac";
const USERS_PAGE_SIZE = 20;

const sections: SegmentItem<Tab>[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles & permissions", icon: Shield },
  { id: "products", label: "Product review", icon: Package },
  { id: "audit", label: "Audit log", icon: History },
  { id: "settings", label: "Operations", icon: Settings },
];

const integrations = [
  { href: "/admin/sellers", title: "Sellers", desc: "Applications and seller verification", Icon: Store },
  { href: "/support", title: "Support", desc: "Tickets and agent workflows", Icon: HeartHandshake },
  { href: "/admin/orders", title: "Orders", desc: "Customer orders and fulfillment", Icon: ClipboardList },
  { href: "/admin/returns", title: "Returns", desc: "Returns and refunds", Icon: RefreshCcw },
  { href: "/admin/shipments", title: "Shipments", desc: "Delivery tracking", Icon: Boxes },
  { href: "/admin/financial", title: "Financial", desc: "Reporting, balance and reconciliation", Icon: CreditCard },
  { href: "/admin/analytics", title: "Analytics", desc: "Financial analytics", Icon: BarChart3 },
  { href: "/admin/content", title: "Content & settings", desc: "Pages, navigation and banners", Icon: BookOpen },
  { href: "/admin/observability", title: "System monitoring", desc: "Health, alerts and incident workflows", Icon: AlertTriangle },
  { href: "/admin/inventory", title: "Inventory", desc: "Stock and warehouse operations", Icon: Boxes },
];

function message(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { detail?: string; error?: string } } }).response;
    return response?.data?.detail || response?.data?.error || "Request failed.";
  }
  return error instanceof Error ? error.message : "Request failed.";
}
function unwrap<T>(data: T[] | Paginated<T>): T[] { return Array.isArray(data) ? data : data.results; }
function fmt(value: number) { return new Intl.NumberFormat("en-US").format(value); }
function accountType(user: User) {
  return user.is_superuser ? "Superuser" : user.is_staff ? "Staff" : user.is_seller ? "Seller" : "Customer";
}
function initials(user: User) {
  const source = user.full_name?.trim() || user.email;
  return source.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function SuperAdminConsole() {
  const user = useAuthStore((s) => s.user), authenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.isBootstrapped), loading = useAuthStore((s) => s.isLoading);
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  const [roleName, setRoleName] = useState(""), [roleDescription, setRoleDescription] = useState("");
  const [assignedUser, setAssignedUser] = useState(""), [assignedRole, setAssignedRole] = useState("");
  const [roleEdit, setRoleEdit] = useState(""), [permissionEdit, setPermissionEdit] = useState("");
  const [permissionEnabled, setPermissionEnabled] = useState(true);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const allowed = Boolean(user?.is_superuser && authenticated);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!bootstrapped || !allowed) return;
    let active = true;
    const calls: Record<Tab, () => Promise<void>> = {
      overview: async () => {
        const r = await apiClient.get<Overview>(`${base}/console/overview/`);
        if (active) setOverview(r.data);
      },
      users: async () => {
        const r = await apiClient.get<Paginated<User>>(`${base}/console/users/`, { params: { page: userPage, search: userQuery } });
        if (active) { setUsers(unwrap(r.data)); setUserCount(r.data.count); setUsersLoaded(true); }
      },
      roles: async () => {
        const r = await apiClient.get<{ roles: Role[]; permissions: Permission[] }>(`${base}/console/role-catalog/`);
        if (active) { setRoles(r.data.roles); setPermissions(r.data.permissions); setRolesLoaded(true); }
      },
      products: async () => {},
      audit: async () => {},
      settings: async () => {},
    };
    void calls[tab]().catch((e) => { if (active) setError(message(e)); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [bootstrapped, allowed, tab, version, userPage, userQuery]);

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); setNotice(success); refresh(); return true; }
    catch (e) { setError(message(e)); return false; }
    finally { setBusy(false); }
  }

  function selectTab(next: Tab) { setTab(next); setError(""); setNotice(""); }

  if (!bootstrapped || loading) {
    return <main className="grid gap-6" aria-busy="true">
      <p role="status" className="sr-only">Checking super admin access…</p>
      <Skeleton className="h-24 max-w-xl" />
      <Skeleton className="h-11 max-w-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
    </main>;
  }
  if (!allowed) return <AccessDenied title="Super Admin only" description="This console requires a signed-in superuser account. Django API enforces access independently." />;

  return <main className="grid gap-6 sm:gap-7">
    <PageHeader eyebrow="Platform control" title="Super Admin Console"
      description="Manage identities, access, moderation, audits and platform operations. Every change is enforced and audited by the API."
      actions={<span className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs">
        <ShieldCheck size={15} className="shrink-0 text-success" aria-hidden="true" />
        <span className="truncate">Signed in as {user?.email}</span>
      </span>} />

    <SegmentedNav label="Super admin sections" items={sections} value={tab} onChange={selectTab} />

    <div className="grid gap-3 empty:hidden">
      {error && <Notice tone="danger" title="Something went wrong" action={<Button size="small" variant="secondary" onClick={refresh}>Retry</Button>}>{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}
      {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Saving changes…</p>}
    </div>

    {tab === "overview" && <OverviewPanel overview={overview} failed={Boolean(error)} onReview={() => selectTab("products")} />}

    {tab === "users" && <UsersPanel
      users={users} loaded={usersLoaded} count={userCount} page={userPage} busy={busy} currentUserId={user?.id}
      search={userSearch} onSearchChange={setUserSearch}
      onSearch={(event) => { event.preventDefault(); setUserPage(1); setUserQuery(userSearch); }}
      onPage={(next) => setUserPage(next)}
      onManage={(target) => setPending({ kind: "status", user: target })}
      onRemoveRole={(target, role) => setPending({ kind: "remove-role", user: target, role })} />}

    {tab === "roles" && <section aria-labelledby="roles-heading" className="grid gap-5">
      <h2 id="roles-heading" className="sr-only">Roles & permissions</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Create role" description="Roles start at level 10 with no permissions; grant permissions below." />
          <form className="mt-5 grid gap-4" onSubmit={(e) => {
            e.preventDefault();
            void run(() => apiClient.post(`${base}/roles/`, { name: roleName, description: roleDescription, level: 10 }), "Role created.");
            setRoleName(""); setRoleDescription("");
          }}>
            <Field label="Role code" htmlFor="sa-role-name" required hint="Lowercase code, e.g. support_lead." hintId="sa-role-name-hint">
              <Input id="sa-role-name" required placeholder="Role code (e.g. support_lead)" aria-describedby="sa-role-name-hint" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
            </Field>
            <Field label="Description" htmlFor="sa-role-desc">
              <Textarea id="sa-role-desc" rows={3} placeholder="Role description" value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} />
            </Field>
            <div><Button type="submit" disabled={busy}>Create role</Button></div>
          </form>
        </Card>
        <Card>
          <CardHeader title="Assign role" description="Use a user ID from the Users section. Permissions are checked by the API." />
          <form className="mt-5 grid gap-4" onSubmit={(e) => {
            e.preventDefault();
            void run(() => apiClient.post(`${base}/assign-role/`, { user_id: Number(assignedUser), role_id: Number(assignedRole) }), "Role assigned.");
            setAssignedUser("");
          }}>
            <Field label="User ID" htmlFor="sa-assign-user" required>
              <Input id="sa-assign-user" required min={1} type="number" inputMode="numeric" placeholder="User ID" value={assignedUser} onChange={(e) => setAssignedUser(e.target.value)} />
            </Field>
            <Field label="Role" htmlFor="sa-assign-role" required>
              <Select id="sa-assign-role" required value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)}>
                <option value="">Select role</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <div><Button type="submit" disabled={busy}>Assign role</Button></div>
          </form>
        </Card>
      </div>
      <Card>
        <CardHeader title="Edit role permission" description="System roles are immutable here. Changes invalidate the permission cache and are audited." />
        <form className="mt-5 grid gap-4" onSubmit={(e) => {
          e.preventDefault();
          void run(() => apiClient.post(`${base}/console/roles/${roleEdit}/permissions/`, { permission_id: Number(permissionEdit), enabled: permissionEnabled }), "Role permission updated and audited.");
        }}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Role" htmlFor="sa-edit-role" required>
              <Select id="sa-edit-role" required value={roleEdit} onChange={(e) => setRoleEdit(e.target.value)}>
                <option value="">Choose non-system role</option>
                {roles.filter((r) => !r.is_system_role).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Permission" htmlFor="sa-edit-permission" required>
              <Select id="sa-edit-permission" required value={permissionEdit} onChange={(e) => setPermissionEdit(e.target.value)}>
                <option value="">Choose permission</option>
                {permissions.map((p) => <option key={p.id} value={p.id}>{p.module} / {p.codename}</option>)}
              </Select>
            </Field>
            <Field label="Change" htmlFor="sa-edit-mode">
              <Select id="sa-edit-mode" value={permissionEnabled ? "add" : "remove"} onChange={(e) => setPermissionEnabled(e.target.value === "add")}>
                <option value="add">Grant permission</option>
                <option value="remove">Revoke permission</option>
              </Select>
            </Field>
          </div>
          <div><Button type="submit" disabled={busy}>Update permission</Button></div>
        </form>
      </Card>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Role catalog</h2>
          <p className="mt-1 text-sm text-muted">{rolesLoaded ? `${fmt(roles.length)} roles · ${fmt(permissions.length)} permissions` : "Loading roles…"}</p>
        </div>
      </div>
      {!rolesLoaded && !error
        ? <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
        : roles.length === 0
          ? <EmptyState icon={<KeyRound size={24} />} title="No roles yet" description="Create the first role above, then grant it permissions." />
          : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.map((r) => <RoleCard key={r.id} role={r} />)}</div>}
    </section>}

    {tab === "products" && <ProductModerationCollection key={user?.id} />}
    {tab === "audit" && <AuditLogCollection key={user?.id} />}

    {tab === "settings" && <section aria-labelledby="ops-heading" className="grid gap-5">
      <h2 id="ops-heading" className="sr-only">Platform operations</h2>
      <Notice tone="info" title="Platform operations">
        Use the permission-protected workspaces below for content, finance and monitoring. Infrastructure secrets, tokens,
        database settings and security controls are intentionally not editable from the browser.
      </Notice>
      <WorkspaceLinks />
    </section>}

    {pending?.kind === "status" && <ConfirmDialog
      title={`${pending.user.is_active ? "Suspend" : "Activate"} ${pending.user.email}?`}
      description="This action is recorded in the audit log. Privileged accounts cannot be changed here."
      reasonLabel="Reason (required, at least 5 characters)" reasonMinLength={5}
      confirmLabel={pending.user.is_active ? "Suspend user" : "Activate user"}
      tone={pending.user.is_active ? "danger" : "primary"} busy={busy}
      onCancel={() => setPending(null)}
      onConfirm={(reason) => {
        const target = pending.user;
        void run(() => apiClient.post(`${base}/console/users/${target.id}/set-status/`, { is_active: !target.is_active, reason }), "User status updated and audited.")
          .then(() => setPending(null));
      }} />}
    {pending?.kind === "remove-role" && <ConfirmDialog
      title={`Remove role ${pending.role.name}?`}
      description={<>The role will be removed from <strong className="font-medium text-foreground">{pending.user.email}</strong>. This change is audited.</>}
      confirmLabel="Remove role" tone="danger" busy={busy}
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const { user: target, role } = pending;
        void run(() => apiClient.delete(`${base}/remove-role/${target.id}/${role.id}/`), "Role removed and audited.").then(() => setPending(null));
      }} />}
  </main>;
}

function OverviewPanel({ overview, failed, onReview }: { overview: Overview | null; failed: boolean; onReview: () => void }) {
  if (!overview) {
    if (failed) return <EmptyState icon={<LayoutDashboard size={24} />} title="No overview available" description="The platform overview could not be loaded. Retry above or open a workspace directly." />;
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      <p role="status" className="sr-only">Loading platform overview…</p>
      {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}
    </div>;
  }
  const groups: { title: string; items: { label: string; value: number; hint?: string; href?: string }[] }[] = [
    { title: "People", items: [
      { label: "Users", value: overview.users, hint: `${fmt(overview.active_users)} active` },
      { label: "Active users", value: overview.active_users },
      { label: "Sellers", value: overview.sellers, href: "/admin/sellers" },
      { label: "Pending sellers", value: overview.pending_sellers, href: "/admin/sellers" },
    ] },
    { title: "Catalog & commerce", items: [
      { label: "Products", value: overview.products },
      { label: "Products to review", value: overview.pending_products },
      { label: "Orders", value: overview.orders, href: "/admin/orders" },
      { label: "Open tickets", value: overview.open_tickets, href: "/support" },
    ] },
    { title: "Access & audit", items: [
      { label: "Roles", value: overview.roles },
      { label: "Admin actions", value: overview.recent_admin_actions, hint: "Recent audited changes" },
    ] },
  ];
  const attention = [
    overview.pending_sellers > 0 && { key: "sellers", text: `${fmt(overview.pending_sellers)} seller application${overview.pending_sellers === 1 ? "" : "s"} awaiting verification`, action: <Link href="/admin/sellers" className="font-medium text-brand underline-offset-4 hover:underline">Review sellers</Link> },
    overview.pending_products > 0 && { key: "products", text: `${fmt(overview.pending_products)} product${overview.pending_products === 1 ? "" : "s"} awaiting moderation`, action: <button type="button" onClick={onReview} className="font-medium text-brand underline-offset-4 hover:underline">Open product review</button> },
    overview.open_tickets > 0 && { key: "tickets", text: `${fmt(overview.open_tickets)} open support ticket${overview.open_tickets === 1 ? "" : "s"}`, action: <Link href="/support" className="font-medium text-brand underline-offset-4 hover:underline">Open support</Link> },
  ].filter(Boolean) as { key: string; text: string; action: ReactNode }[];

  return <div className="grid gap-7">
    {attention.length > 0 && <Card className="border-ember-200 bg-ember-50/60">
      <CardHeader eyebrow="Needs attention" title="Queues waiting on a decision" />
      <ul className="mt-4 grid gap-2.5">
        {attention.map((item) => <li key={item.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-ember-100 bg-surface px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-foreground"><AlertTriangle size={16} className="shrink-0 text-brand" aria-hidden="true" />{item.text}</span>
          {item.action}
        </li>)}
      </ul>
    </Card>}
    {groups.map((group) => <section key={group.title} aria-label={group.title} className="grid gap-3">
      <h2 className="mb-eyebrow">{group.title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {group.items.map((item) => <div key={item.label} className="relative">
          <StatCard label={item.label} value={fmt(item.value)} hint={item.hint} />
          {item.href && <Link href={item.href} className="absolute right-4 bottom-4 inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-foreground" aria-label={`Open ${item.label.toLowerCase()} workspace`}>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>}
        </div>)}
      </div>
    </section>)}
    <section aria-labelledby="workspaces-heading" className="grid gap-3">
      <h2 id="workspaces-heading" className="text-base font-semibold tracking-tight text-foreground">Existing admin workspaces</h2>
      <WorkspaceLinks />
    </section>
  </div>;
}

function WorkspaceLinks() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {integrations.map(({ href, title, desc, Icon }) => <Link key={href + title} href={href}
      className="group flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-4 shadow-xs transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-md sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-ember-50 group-hover:text-brand" aria-hidden="true"><Icon size={19} /></span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold text-foreground">{title}</strong>
        <span className="mt-0.5 block text-sm leading-6 text-muted">{desc}</span>
      </span>
      <ArrowRight size={16} className="mt-1 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
    </Link>)}
  </div>;
}

function UsersPanel({ users, loaded, count, page, busy, currentUserId, search, onSearchChange, onSearch, onPage, onManage, onRemoveRole }: {
  users: User[]; loaded: boolean; count: number; page: number; busy: boolean; currentUserId?: number;
  search: string; onSearchChange: (value: string) => void; onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onPage: (page: number) => void; onManage: (user: User) => void; onRemoveRole: (user: User, role: { id: number; name: string }) => void;
}) {
  return <section aria-labelledby="users-heading" className="grid gap-4">
    <h2 id="users-heading" className="sr-only">Users</h2>
    <Card className="p-4 sm:p-4">
      <form role="search" onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="sa-user-search" className="sr-only">Search users</label>
        <div className="relative min-w-0 flex-1">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input id="sa-user-search" type="search" className="pl-10" placeholder="Search by email or name" value={search} onChange={(e) => onSearchChange(e.target.value)} />
        </div>
        <Button type="submit">Search</Button>
      </form>
    </Card>
    {!loaded
      ? <div className="grid gap-2" aria-busy="true"><p role="status" className="sr-only">Loading users…</p>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      : users.length === 0
        ? <EmptyState icon={<Users size={24} />} title="No users match" description="Try a different email or name, or clear the search." />
        : <TableFrame>
          <table className="mb-table min-w-[48rem]">
            <thead><tr><th scope="col">User</th><th scope="col">Type / roles</th><th scope="col">Status</th><th scope="col">Joined</th><th scope="col" className="text-right">Action</th></tr></thead>
            <tbody>{users.map((item) => {
              const locked = item.is_staff || item.is_superuser || item.id === currentUserId;
              return <tr key={item.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700" aria-hidden="true">{initials(item)}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{item.full_name || "Unnamed"} <span className="font-mono text-xs font-normal text-slate-500">#{item.id}</span></div>
                      <div className="truncate text-muted">{item.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge tone={item.is_superuser ? "ink" : item.is_staff ? "info" : item.is_seller ? "brand" : "neutral"}>{accountType(item)}</Badge>
                  {item.roles.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Roles for ${item.email}`}>
                    {item.roles.map((r) => <li key={r.id}>
                      <button type="button" title="Remove this role" disabled={busy || item.is_superuser}
                        aria-label={`Remove role ${r.name} from ${item.email}`}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2 text-xs text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50"
                        onClick={() => onRemoveRole(item, r)}>{r.name}<X size={12} aria-hidden="true" /></button>
                    </li>)}
                  </ul>}
                </td>
                <td>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={item.is_active ? "active" : "suspended"} label={item.is_active ? "Active" : "Suspended"} />
                    {!item.email_verified && <span className="text-xs text-muted">Email unverified</span>}
                  </div>
                </td>
                <td className="whitespace-nowrap text-muted" data-numeric>{item.date_joined ? new Date(item.date_joined).toLocaleDateString() : "—"}</td>
                <td className="text-right">
                  {locked
                    ? <span className="inline-flex items-center gap-1 text-xs text-muted" title="Privileged or own accounts cannot be changed here"><Lock size={13} aria-hidden="true" />Protected</span>
                    : <Button size="small" variant="secondary" onClick={() => onManage(item)} aria-label={`Manage ${item.email}`}><UserCog size={15} aria-hidden="true" />Manage</Button>}
                </td>
              </tr>;
            })}</tbody>
          </table>
        </TableFrame>}
    <Pagination label="User pages" summary={`${fmt(count)} users • Page ${page}`}
      canPrevious={page > 1} canNext={page * USERS_PAGE_SIZE < count} disabled={busy}
      onPrevious={() => onPage(page - 1)} onNext={() => onPage(page + 1)} />
  </section>;
}

function RoleCard({ role }: { role: Role }) {
  const visible = role.permissions.slice(0, 8);
  const rest = role.permissions.slice(8);
  return <article className="mb-card flex min-w-0 flex-col p-5">
    <div className="flex items-start justify-between gap-3">
      <h3 className="min-w-0 font-mono text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{role.name}</h3>
      {role.is_system_role && <Badge tone="neutral"><Lock size={11} aria-hidden="true" />System role</Badge>}
    </div>
    <p className="mt-1.5 text-sm leading-6 text-muted">{role.description || "No description"}</p>
    <p className="mt-3 text-xs text-muted" data-numeric>{role.permissions_count} permissions · level {role.level}</p>
    {visible.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5">
      {visible.map((p) => <li key={p} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[0.6875rem] text-slate-700">{p}</li>)}
    </ul>}
    {rest.length > 0 && <details className="mt-2 text-xs">
      <summary className="inline-flex min-h-8 items-center font-medium text-slate-700 hover:text-foreground">Show {rest.length} more</summary>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {rest.map((p) => <li key={p} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[0.6875rem] text-slate-700">{p}</li>)}
      </ul>
    </details>}
  </article>;
}

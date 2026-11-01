"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, BarChart3, BookOpen, Boxes, ClipboardList, CreditCard, History, LayoutDashboard, Loader2, Package, RefreshCcw, Settings, Shield, Store, Users } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "@/features/auth/components/access-denied";

type Paginated<T> = { count: number; results: T[]; next: string | null; previous: string | null };
type Overview = { users:number; active_users:number; sellers:number; pending_sellers:number; products:number; pending_products:number; orders:number; open_tickets:number; roles:number; recent_admin_actions:number };
type User = { id:number; email:string; full_name:string; phone:string|null; is_active:boolean; is_staff:boolean; is_superuser:boolean; is_seller:boolean; email_verified:boolean; date_joined:string; roles:{id:number;name:string}[] };
type Permission = { id:number; name:string; codename:string; module:string };
type Role = { id:number; name:string; description:string; level:number; is_system_role:boolean; permissions:string[]; permissions_count:number };
type Product = { id:number; name:string; sku:string; status:string; seller_email:string; is_active:boolean };
type Audit = { id:number; admin_email:string; action:string; target_user_email:string|null; target_role_name:string|null; details: Record<string,unknown>; created_at:string };
type Tab = "overview"|"users"|"roles"|"products"|"audit"|"settings";
const base = "/api/rbac";
const sections: {id:Tab; label:string; Icon:typeof Users}[] = [
  { id:"overview",label:"Overview",Icon:LayoutDashboard },
  { id:"users",label:"Users",Icon:Users },
  { id:"roles",label:"Roles & permissions",Icon:Shield },
  { id:"products",label:"Product review",Icon:Package },
  { id:"audit",label:"Audit log",Icon:History },
  { id:"settings",label:"Operations",Icon:Settings },
];
const integrations = [
  {href:"/admin/sellers",title:"Sellers",desc:"Applications and seller verification",Icon:Store},
  {href:"/admin/orders",title:"Orders",desc:"Customer orders and fulfillment",Icon:ClipboardList},
  {href:"/admin/returns",title:"Returns",desc:"Returns and refunds",Icon:RefreshCcw},
  {href:"/admin/shipments",title:"Shipments",desc:"Delivery tracking",Icon:Boxes},
  {href:"/admin/financial",title:"Financial",desc:"Reporting, balance and reconciliation",Icon:CreditCard},
  {href:"/admin/analytics",title:"Analytics",desc:"Financial analytics",Icon:BarChart3},
  {href:"/admin/content",title:"Content & settings",desc:"Pages, navigation and banners",Icon:BookOpen},
  {href:"/admin/observability",title:"System monitoring",desc:"Health, alerts and incident workflows",Icon:AlertTriangle},
  {href:"/admin/inventory",title:"Inventory",desc:"Stock and warehouse operations",Icon:Boxes},
];
function message(error:unknown){if(typeof error==="object"&&error!==null&&"response" in error){const response=(error as {response?:{data?:{detail?:string;error?:string}}}).response;return response?.data?.detail || response?.data?.error || "Request failed."}return error instanceof Error?error.message:"Request failed."}
function unwrap<T>(data:T[]|Paginated<T>):T[]{return Array.isArray(data)?data:data.results}
function fmt(value:number){return new Intl.NumberFormat("en-US").format(value)}
function Card({title,number,href}:{title:string;number:number;href?:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div><div className="mt-3 text-3xl font-semibold text-slate-950">{fmt(number)}</div>{href&&<Link href={href} className="mt-3 inline-block text-sm font-medium text-cyan-700">Open workspace →</Link>}</div>}
const button = "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const field = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950";

export function SuperAdminConsole(){
  const user=useAuthStore(s=>s.user), authenticated=useAuthStore(s=>s.isAuthenticated), bootstrapped=useAuthStore(s=>s.isBootstrapped), loading=useAuthStore(s=>s.isLoading);
  const [tab,setTab]=useState<Tab>("overview");
  const [overview,setOverview]=useState<Overview|null>(null);
  const [users,setUsers]=useState<User[]>([]);
  const [userCount,setUserCount]=useState(0);
  const [userPage,setUserPage]=useState(1);
  const [userSearch,setUserSearch]=useState("");
  const [userQuery,setUserQuery]=useState("");
  const [roles,setRoles]=useState<Role[]>([]);
  const [permissions,setPermissions]=useState<Permission[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [productStatus,setProductStatus]=useState("pending");
  const [audit,setAudit]=useState<Audit[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [version,setVersion]=useState(0);
  const [roleName,setRoleName]=useState(""), [roleDescription,setRoleDescription]=useState("");
  const [assignedUser,setAssignedUser]=useState(""),[assignedRole,setAssignedRole]=useState("");
  const [roleEdit,setRoleEdit]=useState(""),[permissionEdit,setPermissionEdit]=useState("");
  const [permissionEnabled,setPermissionEnabled]=useState(true);
  const [selectedUser,setSelectedUser]=useState<User|null>(null);
  const [reason,setReason]=useState("");
  const allowed=Boolean(user?.is_superuser && authenticated);
  const refresh=useCallback(()=>setVersion(v=>v+1),[]);
  useEffect(()=>{
    if(!bootstrapped||!allowed)return;
    let active=true;
    setBusy(true);setError("");
    const calls:Record<Tab,()=>Promise<void>>={
      overview:async()=>{const r=await apiClient.get<Overview>(`${base}/console/overview/`);if(active)setOverview(r.data)},
      users:async()=>{const r=await apiClient.get<Paginated<User>>(`${base}/console/users/`,{params:{page:userPage,search:userQuery}});if(active){setUsers(unwrap(r.data));setUserCount(r.data.count)}},
      roles:async()=>{const r=await apiClient.get<{roles:Role[];permissions:Permission[]}>(`${base}/console/role-catalog/`);if(active){setRoles(r.data.roles);setPermissions(r.data.permissions)}},
      products:async()=>{const r=await apiClient.get<Paginated<Product>>(`${base}/console/products/`,{params:{status:productStatus}});if(active)setProducts(unwrap(r.data))},
      audit:async()=>{const r=await apiClient.get<Paginated<Audit>>(`${base}/admin-logs/`);if(active)setAudit(unwrap(r.data))},
      settings:async()=>{},
    };
    void calls[tab]().catch(e=>{if(active)setError(message(e))}).finally(()=>{if(active)setBusy(false)});
    return()=>{active=false};
  },[bootstrapped,allowed,tab,version,userPage,userQuery,productStatus]);
  async function run(fn:()=>Promise<unknown>,success:string){
    setBusy(true);setError("");setNotice("");
    try{await fn();setNotice(success);refresh()}
    catch(e){setError(message(e))}
    finally{setBusy(false)}
  }
  if(!bootstrapped||loading)return <main role="status" className="mx-auto max-w-7xl px-6 py-12 text-slate-500">Checking super admin access…</main>;
  if(!allowed)return <AccessDenied title="Super Admin only" description="This console requires a signed-in superuser account. Django API enforces access independently." />;
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl space-y-7">
    <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-9"><div className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Mallbyte / Platform control</div><h1 className="mt-3 text-3xl font-semibold tracking-tight">Super Admin Console</h1><p className="mt-2 text-sm text-slate-300">Manage identities, access, moderation, audits and platform operations in one workspace.</p><div className="mt-5 flex items-center gap-3 text-xs text-slate-300"><Shield size={16}/> Signed in as {user?.email}</div></header>
    <nav aria-label="Super admin sections" className="flex flex-wrap gap-2">{sections.map(({id,label,Icon})=><button key={id} onClick={()=>{setTab(id);setError("");setNotice("")}} aria-current={tab===id?"page":undefined} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${tab===id?"border-slate-950 bg-slate-950 text-white":"border-slate-200 bg-white text-slate-700 hover:border-cyan-300"}`}><Icon size={16}/>{label}</button>)}</nav>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button onClick={refresh} className="ml-3 underline">Retry</button></div>}
    {notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
    {busy&&<div role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin"/> Loading or saving…</div>}
    {tab==="overview"&&<div className="space-y-7">
      {overview?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card title="Users" number={overview.users}/><Card title="Active users" number={overview.active_users}/><Card title="Sellers" number={overview.sellers} href="/admin/sellers"/><Card title="Pending sellers" number={overview.pending_sellers} href="/admin/sellers"/><Card title="Products to review" number={overview.pending_products}/><Card title="Orders" number={overview.orders} href="/admin/orders"/><Card title="Open tickets" number={overview.open_tickets}/><Card title="Products" number={overview.products}/><Card title="Roles" number={overview.roles}/><Card title="Admin actions" number={overview.recent_admin_actions}/></div>:!busy&&!error&&<p>No overview available.</p>}
      <h2 className="text-xl font-semibold">Existing admin workspaces</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{integrations.map(({href,title,desc,Icon})=><Link key={href} href={href} className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-cyan-300 hover:shadow-sm"><Icon className="mt-1 text-cyan-700" size={22}/><span className="flex-1"><strong className="block text-slate-950">{title}</strong><span className="mt-1 block text-sm text-slate-500">{desc}</span></span><ArrowRight size={17} className="text-slate-400"/></Link>)}</div>
    </div>}
    {tab==="users"&&<section className="space-y-4"><form onSubmit={e=>{e.preventDefault();setUserPage(1);setUserQuery(userSearch)}} className="flex flex-wrap gap-2"><input className={field+" min-w-60 flex-1"} placeholder="Search by email or name" value={userSearch} onChange={e=>setUserSearch(e.target.value)}/><button className={button}>Search</button></form><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[690px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Type / roles</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{users.map(item=><tr key={item.id} className="border-t border-slate-100"><td className="p-4"><div className="font-semibold">{item.full_name||"Unnamed"}</div><div className="text-slate-500">{item.email}</div></td><td className="p-4 text-slate-600">{item.is_superuser?"Superuser":item.is_staff?"Staff":item.is_seller?"Seller":"Customer"}<div className="text-xs">{item.roles.map(r=>r.name).join(", ")}</div></td><td className="p-4">{item.is_active?"Active":"Suspended"}</td><td className="p-4"><button className="text-cyan-700 underline disabled:text-slate-400" disabled={item.is_staff||item.is_superuser||item.id===user?.id} onClick={()=>{setSelectedUser(item);setReason("")}}>Manage</button></td></tr>)}</tbody></table></div><div className="flex items-center justify-between text-sm text-slate-600"><span>{fmt(userCount)} users • Page {userPage}</span><div className="flex gap-2"><button className={field} disabled={userPage===1} onClick={()=>setUserPage(v=>v-1)}>Previous</button><button className={field} disabled={userPage*20>=userCount} onClick={()=>setUserPage(v=>v+1)}>Next</button></div></div>
    {selectedUser&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-semibold">Change status: {selectedUser.email}</h3><p className="mt-1 text-sm text-slate-700">This action is recorded in the audit log. Privileged accounts cannot be changed here.</p><label className="mt-3 block text-xs font-semibold">Reason (required, at least 5 characters)</label><input className={field+" mt-1 w-full"} value={reason} onChange={e=>setReason(e.target.value)}/><div className="mt-3 flex gap-2"><button className={button} disabled={busy||reason.trim().length<5} onClick={()=>void run(()=>apiClient.post(`${base}/console/users/${selectedUser.id}/set-status/`,{is_active:!selectedUser.is_active,reason}),"User status updated and audited.").then(()=>setSelectedUser(null))}>{selectedUser.is_active?"Suspend user":"Activate user"}</button><button className={field} onClick={()=>setSelectedUser(null)}>Cancel</button></div></div>}
    </section>}
    {tab==="roles"&&<section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2"><form className="space-y-3 rounded-2xl border bg-white p-5" onSubmit={e=>{e.preventDefault();void run(()=>apiClient.post(`${base}/roles/`,{name:roleName,description:roleDescription,level:10}),"Role created.");setRoleName("");setRoleDescription("")}}><h2 className="font-semibold">Create role</h2><input required className={field+" w-full"} placeholder="Role code (e.g. support_lead)" value={roleName} onChange={e=>setRoleName(e.target.value)}/><textarea className={field+" w-full"} placeholder="Role description" value={roleDescription} onChange={e=>setRoleDescription(e.target.value)}/><button disabled={busy} className={button}>Create role</button></form>
      <form className="space-y-3 rounded-2xl border bg-white p-5" onSubmit={e=>{e.preventDefault();void run(()=>apiClient.post(`${base}/assign-role/`,{user_id:Number(assignedUser),role_id:Number(assignedRole)}),"Role assigned.");setAssignedUser("")}}><h2 className="font-semibold">Assign role</h2><p className="text-xs text-slate-500">Use a user ID from Users. Permissions are checked by the API.</p><input required min={1} type="number" className={field+" w-full"} placeholder="User ID" value={assignedUser} onChange={e=>setAssignedUser(e.target.value)}/><select required className={field+" w-full"} value={assignedRole} onChange={e=>setAssignedRole(e.target.value)}><option value="">Select role</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><button disabled={busy} className={button}>Assign role</button></form></div>
      <form className="space-y-3 rounded-2xl border bg-white p-5" onSubmit={e=>{e.preventDefault();void run(()=>apiClient.post(`${base}/console/roles/${roleEdit}/permissions/`,{permission_id:Number(permissionEdit),enabled:permissionEnabled}),"Role permission updated and audited.")}}><h2 className="font-semibold">Edit role permission</h2><p className="text-sm text-slate-500">System roles are immutable here. Changes invalidate the permission cache.</p><div className="grid gap-3 sm:grid-cols-3"><select required className={field} value={roleEdit} onChange={e=>setRoleEdit(e.target.value)}><option value="">Choose non-system role</option>{roles.filter(r=>!r.is_system_role).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><select required className={field} value={permissionEdit} onChange={e=>setPermissionEdit(e.target.value)}><option value="">Choose permission</option>{permissions.map(p=><option key={p.id} value={p.id}>{p.module} / {p.codename}</option>)}</select><select className={field} value={permissionEnabled?"add":"remove"} onChange={e=>setPermissionEnabled(e.target.value==="add")}><option value="add">Grant permission</option><option value="remove">Revoke permission</option></select></div><button className={button} disabled={busy}>Update permission</button></form>
      <div className="grid gap-3 md:grid-cols-2">{roles.map(r=><div key={r.id} className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{r.name}</h3>{r.is_system_role&&<span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">System role</span>}</div><p className="mt-1 text-sm text-slate-500">{r.description||"No description"}</p><p className="mt-2 text-xs text-slate-500">{r.permissions_count} permissions · level {r.level}</p><div className="mt-3 flex flex-wrap gap-1">{r.permissions.map(p=><span key={p} className="rounded bg-cyan-50 px-2 py-1 text-xs text-cyan-800">{p}</span>)}</div></div>)}</div>
    </section>}
    {tab==="products"&&<section className="space-y-4"><div className="flex items-center gap-2"><label htmlFor="moderation-status" className="text-sm font-semibold">Status</label><select id="moderation-status" className={field} value={productStatus} onChange={e=>setProductStatus(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="draft">Draft</option></select></div><div className="space-y-3">{products.map(p=><article key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-5"><div className="flex-1"><h3 className="font-semibold">{p.name}</h3><div className="text-sm text-slate-500">{p.sku} · {p.seller_email} · {p.status}</div></div>{p.status==="pending"&&<><button className={button} disabled={busy} onClick={()=>void run(()=>apiClient.post(`/api/products/products/${p.id}/approve/`),"Product approved.")}>Approve</button><button className={field} disabled={busy} onClick={()=>{const reason=window.prompt("Reason for rejection (required)");if(reason&&reason.trim().length>=5)void run(()=>apiClient.post(`/api/products/products/${p.id}/reject/`,{reason}),"Product rejected.");else if(reason!==null)setError("Enter a reason of at least 5 characters.")}}>Reject</button></>}</article>)}{!busy&&!products.length&&<p className="text-sm text-slate-500">No products found for this filter.</p>}</div></section>}
    {tab==="audit"&&<section className="space-y-3">{audit.map(item=><article key={item.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.action}</strong><time className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</time></div><p className="mt-1 text-sm text-slate-600">{item.admin_email||"Unknown actor"} · {item.target_user_email||item.target_role_name||"Platform"}</p><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(item.details,null,2)}</pre></article>)}{!busy&&!audit.length&&<p className="text-sm text-slate-500">No audit actions found.</p>}</section>}
    {tab==="settings"&&<section className="space-y-4"><div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><h2 className="font-semibold">Platform operations</h2><p className="mt-2 text-sm text-slate-700">Use existing permission-protected workspaces for content, finance and monitoring. Infrastructure secrets, tokens, database settings and security controls are intentionally not editable from the browser.</p></div><div className="grid gap-3 sm:grid-cols-2">{integrations.map(({href,title,desc,Icon})=><Link key={href} href={href} className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-cyan-400"><Icon size={20}/><div className="flex-1"><div className="font-semibold">{title}</div><div className="text-sm text-slate-500">{desc}</div></div><ArrowRight size={16}/></Link>)}</div></section>}
  </div></main>;
}

import Link from "next/link";
import {
  BarChart3, BookOpen, Boxes, CircleDollarSign, ClipboardList, HeartHandshake,
  LineChart, PackageCheck, ShieldAlert, Truck,
} from "lucide-react";

const sections = [
  { title: "Observability", description: "System health, API logs, alerts, incidents and approved operations. Requires an Observability role.", href: "/admin/observability", icon: ShieldAlert, accent: "text-cyan-700 bg-cyan-50" },
  { title: "Content & CMS", description: "Editorial pages, banners, announcements, FAQs and navigation. Requires a content role.", href: "/admin/content", icon: BookOpen, accent: "text-cyan-700 bg-cyan-50" },
  { title: "Financial workspace", description: "All analytics, ledger and audit tools in one place.", href: "/admin/financial", icon: CircleDollarSign, accent: "text-cyan-700 bg-cyan-50" },
  { title: "Financial analytics", description: "Cash flow, refunds and multi-currency trends.", href: "/admin/analytics", icon: BarChart3, accent: "text-cyan-700 bg-cyan-50" },
  { title: "Financial monitoring", description: "Audit history, open alerts and controlled checks.", href: "/admin/monitoring", icon: ShieldAlert, accent: "text-amber-700 bg-amber-50" },
  { title: "Reconciliation & balances", description: "Seller ledger, discrepancy reports and CSV exports.", href: "/admin/finance", icon: CircleDollarSign, accent: "text-emerald-700 bg-emerald-50" },
  { title: "Seller management", description: "Review applications and verify stores.", href: "/admin/sellers", icon: HeartHandshake, accent: "text-violet-700 bg-violet-50" },
  { title: "Orders", description: "Manage customer orders and fulfillment states.", href: "/admin/orders", icon: ClipboardList, accent: "text-sky-700 bg-sky-50" },
  { title: "Returns", description: "Process returns and verified refund workflows.", href: "/admin/returns", icon: PackageCheck, accent: "text-rose-700 bg-rose-50" },
  { title: "Shipments", description: "Track parcels and delivery operations.", href: "/admin/shipments", icon: Truck, accent: "text-indigo-700 bg-indigo-50" },
  { title: "Inventory", description: "Check stock, reservations and warehouse activity.", href: "/admin/inventory", icon: Boxes, accent: "text-teal-700 bg-teal-50" },
];

export default function AdminDashboardPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-7xl"><div className="rounded-[2rem] bg-slate-950 px-7 py-10 text-white shadow-xl shadow-slate-200 sm:px-10"><p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">MallByte / Workspace</p><h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Admin control center</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">One workspace for marketplace operations, content management and financial oversight. Every section enforces its own permissions.</p><div className="mt-7 flex items-center gap-2 text-xs text-slate-400"><LineChart size={15}/> Live data is loaded inside each section.</div></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sections.map(({title,description,href,icon: Icon,accent}) => <Link key={href} href={href} className="group flex min-h-48 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}><Icon size={23}/></div><div className="mt-5"><h2 className="text-base font-semibold text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><p className="mt-4 text-xs font-semibold text-cyan-700 group-hover:underline">Open workspace →</p></div></Link>)}</div></div></main>;
}

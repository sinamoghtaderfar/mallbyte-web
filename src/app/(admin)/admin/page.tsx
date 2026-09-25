import Link from "next/link";

const adminSections = [
  {
    title: "Seller management",
    description: "Review seller applications and approve or reject stores.",
    href: "/admin/sellers",
    status: "Ready",
  },
  {
    title: "Return management",
    description:
      "Review return requests, receive returned items, and complete refunds.",
    href: "/admin/returns",
    status: "Ready",
  },
  {
    title: "Shipping management",
    description:
      "Create shipments for paid orders and manage delivery progress.",
    href: "/admin/shipments",
    status: "Ready",
  },
  {
    title: "Inventory management",
    description:
      "Monitor warehouse stock, reserved inventory, available quantities, and low-stock products.",
    href: "/admin/inventory",
    status: "Ready",
  },
  {
    title: "Order management",
    description: "Review orders, payment status, and fulfillment progress.",
    href: "/admin/orders",
    status: "Ready",
  },
];

const upcomingSections = ["Support tickets", "Analytics", "Observability"];

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Admin
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Admin dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Manage platform-level workflows for sellers, returns, shipping,
          inventory, refunds, and future operations.
        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {adminSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {section.title}
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  {section.description}
                </p>
              </div>

              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                {section.status}
              </span>
            </div>

            <p className="mt-6 text-sm font-medium text-slate-900">
              Open section →
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Coming next</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingSections.map((section) => (
            <div
              key={section}
              className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-medium text-slate-700">{section}</p>

              <p className="mt-1 text-xs text-slate-500">Not built yet</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

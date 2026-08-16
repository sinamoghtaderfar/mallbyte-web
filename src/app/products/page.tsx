import { SiteShell } from "@/components/layout/site-shell";
import { ProductList } from "@/features/products/components/product-list";

export default function ProductsPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Marketplace
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Products
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Browse products loaded from the MallByte backend API.
            </p>
          </div>

          <ProductList />
        </div>
      </main>
    </SiteShell>
  );
}

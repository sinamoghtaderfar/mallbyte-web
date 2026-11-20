import { SiteShell } from "@/components/layout/site-shell";
import { ProductList } from "@/features/products/components/product-list";

export default function ProductsPage() {
  return (
    <SiteShell>
      <main className="px-4 py-7 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-7xl">
          <ProductList />
        </div>
      </main>
    </SiteShell>
  );
}

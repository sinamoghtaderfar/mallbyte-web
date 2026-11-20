import { SiteShell } from "@/components/layout/site-shell";
import { ProductList } from "@/features/products/components/product-list";

export default function ProductsPage() {
  return (
    <SiteShell>
      <main className="mb-container pb-24 pt-10 sm:pt-14">
        <ProductList />
      </main>
    </SiteShell>
  );
}

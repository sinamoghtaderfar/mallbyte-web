import { SiteShell } from "@/components/layout/site-shell";
import { ProductDetail } from "@/features/products/components/product-detail";

export default function ProductDetailPage() {
  return (
    <SiteShell>
      <main className="mb-container pb-24 pt-8 sm:pt-10">
        <ProductDetail />
      </main>
    </SiteShell>
  );
}

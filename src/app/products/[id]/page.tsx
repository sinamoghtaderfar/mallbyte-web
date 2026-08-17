import { SiteShell } from "@/components/layout/site-shell";
import { ProductDetail } from "@/features/products/components/product-detail";

export default function ProductDetailPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProductDetail />
        </div>
      </main>
    </SiteShell>
  );
}

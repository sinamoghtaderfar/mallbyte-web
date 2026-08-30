import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerProductDetail } from "@/features/seller-products/components/seller-product-detail";

export default function SellerProductDetailPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerProductDetail />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

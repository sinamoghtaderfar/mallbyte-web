import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerOrderDetail } from "@/features/seller-orders/components/seller-order-detail";

export default function SellerOrderDetailPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerOrderDetail />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

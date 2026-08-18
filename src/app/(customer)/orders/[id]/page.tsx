import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { OrderDetail } from "@/features/orders/components/order-detail";

export default function OrderDetailPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerOrdersList } from "@/features/seller-orders/components/seller-orders-list";

export default function SellerOrdersPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerOrdersList />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

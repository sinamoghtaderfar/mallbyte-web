import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { OrdersList } from "@/features/orders/components/orders-list";

export default function OrdersPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <OrdersList />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

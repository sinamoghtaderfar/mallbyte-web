import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { CartPanel } from "@/features/cart/components/cart-panel";

export default function CartPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <CartPanel />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

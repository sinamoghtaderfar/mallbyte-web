import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerProductEditForm } from "@/features/seller-products/components/seller-product-edit-form";

export default function SellerProductEditPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerProductEditForm />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

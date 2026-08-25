import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerApplicationForm } from "@/features/seller/components/seller-application-form";

export default function SellerApplyPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerApplicationForm />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

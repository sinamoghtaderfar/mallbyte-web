import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { ReturnDetail } from "@/features/returns/components/return-detail";

export default function ReturnDetailPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <ReturnDetail />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

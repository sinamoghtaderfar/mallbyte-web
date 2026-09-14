import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { ReturnsList } from "@/features/returns/components/returns-list";

export default function ReturnsPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <ReturnsList />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

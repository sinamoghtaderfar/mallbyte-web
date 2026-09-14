import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { ReturnRequestForm } from "@/features/returns/components/return-request-form";

export default function CreateReturnPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <ReturnRequestForm />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

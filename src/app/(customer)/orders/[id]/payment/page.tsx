import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { PaymentSimulator } from "@/features/payments/components/payment-simulator";

export default function OrderPaymentPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <PaymentSimulator />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}

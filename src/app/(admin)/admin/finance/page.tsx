import { AdminFinanceDashboard } from "@/features/settlements/components/admin-finance-dashboard";

// Protected by the existing /admin layout. Backend RBAC is authoritative.
export default function AdminFinancePage() {
  return <AdminFinanceDashboard />;
}

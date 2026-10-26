import { FinancialMonitoring } from "@/features/insights/components/financial-monitoring";

// /admin/layout.tsx protects this route; backend permissions remain authoritative.
export default function FinancialMonitoringPage() {
  return <FinancialMonitoring />;
}

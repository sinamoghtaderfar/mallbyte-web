"use client";

import { useParams } from "next/navigation";

import { SiteShell } from "@/components/layout/site-shell";
import { SupportCenter } from "@/features/support/components/support-center";

export default function SupportTicketPage() {
  const params = useParams<{ id: string }>();
  const ticketId = Number(params.id);

  return (
    <SiteShell>
      <SupportCenter
        initialTicketId={Number.isFinite(ticketId) ? ticketId : undefined}
      />
    </SiteShell>
  );
}

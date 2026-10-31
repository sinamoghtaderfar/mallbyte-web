export type SupportTicketStatus = "open" | "pending" | "resolved" | "closed";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export type SupportTicketCategory =
  | "order"
  | "payment"
  | "shipping"
  | "return"
  | "product"
  | "account"
  | "other";

export type SupportTag = {
  id: number;
  name: string;
  slug: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TicketMessage = {
  id: number;
  ticket: number;
  sender: number;
  sender_display: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
  updated_at: string;
};

export type TicketAttachment = {
  id: number;
  ticket: number;
  message: number | null;
  uploaded_by: number;
  uploaded_by_display: string;
  download_url: string;
  original_filename: string;
  content_type: string;
  size: number;
  created_at: string;
};

export type TicketAuditLog = {
  id: number;
  ticket: number;
  actor: number | null;
  actor_display: string | null;
  action: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SupportTicket = {
  id: number;
  ticket_number: string;
  customer: number;
  customer_display: string;
  assigned_to: number | null;
  assigned_to_display: string | null;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  order: number | null;
  product: number | null;
  return_request: number | null;
  last_message_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  messages: TicketMessage[];
  created_at: string;
  updated_at: string;
  tags: number[];
  tags_detail: SupportTag[];
  attachments: TicketAttachment[];
};

export type SupportSummary = {
  status: {
    total: number;
    open: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  priority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
  category: {
    order: number;
    payment: number;
    shipping: number;
    return_ticket: number;
    product: number;
    account: number;
    other: number;
  };
  assigned_to_me: number;
  unassigned: number;
};

export type SupportAgent = {
  id: number;
  email: string;
  full_name: string;
};

export type SupportTicketFilters = {
  status?: SupportTicketStatus | "";
  priority?: SupportTicketPriority | "";
  category?: SupportTicketCategory | "";
  assigned_to?: number | "me" | "";
  customer?: number | "";
  order?: number | "";
  product?: number | "";
  ordering?: string;
};

export type CreateSupportTicketPayload = {
  subject: string;
  category: SupportTicketCategory;
  initial_message: string;
  order?: number;
  product?: number;
  return_request?: number;
};

export type SupportTagPayload = {
  name: string;
  color?: string;
  is_active?: boolean;
};

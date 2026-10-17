import type {
    SupportTicketCategory,
    SupportTicketPriority,
    SupportTicketStatus,
} from "./types";

export const SUPPORT_STATUS_OPTIONS: Array<{
  value: SupportTicketStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const SUPPORT_PRIORITY_OPTIONS: Array<{
  value: SupportTicketPriority;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const SUPPORT_CATEGORY_OPTIONS: Array<{
  value: SupportTicketCategory;
  label: string;
}> = [
  { value: "order", label: "Order" },
  { value: "payment", label: "Payment" },
  { value: "shipping", label: "Shipping" },
  { value: "return", label: "Return" },
  { value: "product", label: "Product" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
];

export function getStatusLabel(status: SupportTicketStatus) {
  return SUPPORT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function getPriorityLabel(priority: SupportTicketPriority) {
  return (
    SUPPORT_PRIORITY_OPTIONS.find((item) => item.value === priority)?.label ??
    priority
  );
}

export function getCategoryLabel(category: SupportTicketCategory) {
  return (
    SUPPORT_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ??
    category
  );
}

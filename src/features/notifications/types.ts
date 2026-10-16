export type NotificationType =
  | "order"
  | "payment"
  | "shipping"
  | "return"
  | "discount"
  | "system"
  | "product"
  | "inventory"
  | "support";

export type NotificationChannel =
  | "in_app"
  | "email"
  | "sms"
  | "push";

export type NotificationPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type Notification = {
  id: number;
  user: string;

  title: string;
  message: string;

  notification_type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;

  is_read: boolean;
  read_at: string | null;

  related_object_type: string;
  related_object_id: string;

  action_url: string;
  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
};

export type NotificationFilters = {
  notification_type?: NotificationType;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  is_read?: boolean;
};
export type NotificationPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
};
export type NotificationUnreadCount = {
  unread_count: number;
};

export type NotificationSummary = {
  total_count: number;
  unread_count: number;
  read_count: number;
  by_type: Partial<Record<NotificationType, number>>;
  by_priority: Partial<Record<NotificationPriority, number>>;
};

export type NotificationPreferences = {
  id: number;
  user: string;

  muted_notification_types: NotificationType[];
  muted_channels: NotificationChannel[];

  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;

  created_at: string;
  updated_at: string;
};

export type UpdateNotificationPreferencesPayload =
  Partial<
    Pick<
      NotificationPreferences,
      | "muted_notification_types"
      | "muted_channels"
      | "email_enabled"
      | "sms_enabled"
      | "push_enabled"
      | "in_app_enabled"
    >
  >;

export type NotificationIdsPayload = {
  ids: number[];
};

export type NotificationCountResponse = {
  marked_count?: number;
  deleted_count?: number;
};
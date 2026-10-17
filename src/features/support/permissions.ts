export const SUPPORT_PERMISSIONS = {
  viewAllTickets: "view_all_support_tickets",
  reply: "reply_support_tickets",
  viewInternalNotes: "view_support_internal_notes",
  addInternalNote: "add_support_internal_note",
  assign: "assign_support_tickets",
  manageTags: "manage_support_tags",
  changePriority: "change_support_priority",
  resolve: "resolve_support_tickets",
  close: "close_support_tickets",
  reopen: "reopen_support_tickets",
  viewAuditLogs: "view_support_audit_logs",
} as const;

export type SupportCapabilities = {
  isSupportStaff: boolean;
  canReplyAsStaff: boolean;
  canViewInternalNotes: boolean;
  canAddInternalNote: boolean;
  canAssign: boolean;
  canManageTags: boolean;
  canChangePriority: boolean;
  canResolve: boolean;
  canClose: boolean;
  canReopen: boolean;
  canViewAuditLogs: boolean;
};

export function getSupportCapabilities(
  permissions: string[],
  isSuperuser = false,
): SupportCapabilities {
  const permissionSet = new Set(permissions);

  const has = (permission: string) =>
    isSuperuser || permissionSet.has(permission);

  return {
    isSupportStaff: has(SUPPORT_PERMISSIONS.viewAllTickets),
    canReplyAsStaff: has(SUPPORT_PERMISSIONS.reply),
    canViewInternalNotes: has(SUPPORT_PERMISSIONS.viewInternalNotes),
    canAddInternalNote: has(SUPPORT_PERMISSIONS.addInternalNote),
    canAssign: has(SUPPORT_PERMISSIONS.assign),
    canManageTags: has(SUPPORT_PERMISSIONS.manageTags),
    canChangePriority: has(SUPPORT_PERMISSIONS.changePriority),
    canResolve: has(SUPPORT_PERMISSIONS.resolve),
    canClose: has(SUPPORT_PERMISSIONS.close),
    canReopen: has(SUPPORT_PERMISSIONS.reopen),
    canViewAuditLogs: has(SUPPORT_PERMISSIONS.viewAuditLogs),
  };
}

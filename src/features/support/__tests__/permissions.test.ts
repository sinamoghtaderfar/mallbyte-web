import { describe, expect, it } from "vitest";

import {
    SUPPORT_PERMISSIONS,
    getSupportCapabilities,
} from "../permissions";

describe("support permissions", () => {
  it("keeps customers out of support staff actions", () => {
    const capabilities = getSupportCapabilities([]);

    expect(capabilities.isSupportStaff).toBe(false);
    expect(capabilities.canAssign).toBe(false);
    expect(capabilities.canManageTags).toBe(false);
    expect(capabilities.canResolve).toBe(false);
  });

  it("models the support agent permission set", () => {
    const capabilities = getSupportCapabilities([
      SUPPORT_PERMISSIONS.viewAllTickets,
      SUPPORT_PERMISSIONS.reply,
      SUPPORT_PERMISSIONS.viewInternalNotes,
      SUPPORT_PERMISSIONS.addInternalNote,
      SUPPORT_PERMISSIONS.resolve,
    ]);

    expect(capabilities.isSupportStaff).toBe(true);
    expect(capabilities.canReplyAsStaff).toBe(true);
    expect(capabilities.canAddInternalNote).toBe(true);
    expect(capabilities.canResolve).toBe(true);

    expect(capabilities.canAssign).toBe(false);
    expect(capabilities.canManageTags).toBe(false);
    expect(capabilities.canClose).toBe(false);
  });

  it("grants every support capability to superusers", () => {
    const capabilities = getSupportCapabilities([], true);

    expect(Object.values(capabilities).every(Boolean)).toBe(true);
  });
});

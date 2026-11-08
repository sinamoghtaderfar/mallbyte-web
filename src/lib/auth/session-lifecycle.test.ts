import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("durable logout intent", () => {
  it("survives a module reload while persisting neither token nor user data", async () => {
    let session = await import("./session-storage");
    session.setAccessToken("private-access-token");
    session.beginLogout();
    expect(localStorage.getItem(session.LOGOUT_STORAGE_KEY)).toMatch(
      /^pending:/,
    );
    expect(JSON.stringify(localStorage)).not.toContain("private-access-token");
    vi.resetModules();
    session = await import("./session-storage");
    expect(session.isSessionRestorationBlocked()).toBe(true);
    expect(session.getAccessToken()).toBeNull();
  });

  it("allows only a current final login to clear the restoration block", async () => {
    const session = await import("./session-storage");
    const beforeLogout = session.getSessionGeneration();
    const current = session.beginLogout();
    expect(session.establishSession("stale", beforeLogout)).toBe(false);
    expect(session.isSessionRestorationBlocked()).toBe(true);
    session.confirmLogout(current);
    expect(session.isSessionRestorationBlocked()).toBe(true);
    expect(session.establishSession("fresh", current)).toBe(true);
    expect(localStorage.getItem(session.LOGOUT_STORAGE_KEY)).toBeNull();
    expect(session.getAccessToken()).toBe("fresh");
    expect(session.isSessionRestorationBlocked()).toBe(false);
  });

  it("detects another tab's logout before its queued storage event is delivered", async () => {
    const session = await import("./session-storage");
    session.setAccessToken("old-token");
    const previous = session.getSessionGeneration();
    localStorage.setItem(session.LOGOUT_STORAGE_KEY, "pending:other-tab");
    expect(session.isCurrentSession(previous)).toBe(false);
    expect(session.getAccessToken()).toBeNull();
  });

  it("fails closed for automatic restore when persistent storage cannot be written", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable");
    });
    let session = await import("./session-storage");
    expect(session.isSessionRestorationBlocked()).toBe(true);
    expect(
      session.establishSession(
        "explicit-login",
        session.getSessionGeneration(),
      ),
    ).toBe(true);
    expect(session.isSessionRestorationBlocked()).toBe(false);
    session.beginLogout();
    expect(session.getAccessToken()).toBeNull();
    vi.resetModules();
    session = await import("./session-storage");
    expect(session.isSessionRestorationBlocked()).toBe(true);
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import { clearSession, getAccessToken, setAccessToken } from "./session-storage";

describe("session storage", () => {
  beforeEach(() => {
    clearSession();
  });
  
  it("starts without an access token", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("stores the access token in memory", () => {
    setAccessToken("access-token");

    expect(getAccessToken()).toBe("access-token");
  });

  it("clears the current session", () => {
    setAccessToken("access-token");

    clearSession();

    expect(getAccessToken()).toBeNull();
  });
});


// Arrange → Act → Assert
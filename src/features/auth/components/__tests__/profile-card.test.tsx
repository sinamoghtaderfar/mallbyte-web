import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { apiClient, sessionClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { setAccessToken } from "@/lib/auth/session-storage";
import { useAuthStore } from "../../auth-store";
import { ProfileCard } from "../profile-card";

const account = {
  id: 7,
  email: "customer@example.test",
  full_name: "Example Customer",
  phone: null,
  is_seller: false,
  email_verified: true,
};
const statusUrl = API_ENDPOINTS.auth.sellerStatus;
let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient, { onNoMatch: "throwException" });
  useAuthStore.getState().setUser(account);
});
afterEach(() => {
  mock.restore();
  setAccessToken(null);
  useAuthStore.getState().clearAuth();
});

describe("Profile seller action", () => {
  it("does not treat a missing refresh endpoint as a missing application", async () => {
    const session = new MockAdapter(sessionClient, {
      onNoMatch: "throwException",
    });
    try {
      setAccessToken("fixture-access");
      mock.onGet(statusUrl).reply(401);
      session.onPost(API_ENDPOINTS.auth.tokenRefresh).reply(404);
      render(<ProfileCard />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /could not check/i,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(session.history.post).toHaveLength(1);
    } finally {
      session.restore();
    }
  });
  it.each([
    [404, undefined, false, "Become a Seller", "/seller/apply"],
    [200, "pending", false, "View Application Status", "/seller/status"],
    [200, "rejected", false, "View Application Status", "/seller/status"],
    [200, "approved", false, "Go to Seller Dashboard", "/seller/dashboard"],
    [200, "suspended", true, "View Seller Status", "/seller/status"],
  ] as const)(
    "maps %s %s to the correct single destination",
    async (code, status, isSeller, label, href) => {
      useAuthStore.getState().setUser({ ...account, is_seller: isSeller });
      mock.onGet(statusUrl).reply(code, { status });
      render(<ProfileCard />);
      expect(await screen.findByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
      expect(screen.getAllByRole("link")).toHaveLength(1);
      expect(mock.history.get).toHaveLength(1);
      expect(mock.history.post).toHaveLength(0);
    },
  );

  it.each([{ is_staff: true }, { is_superuser: true }, null])(
    "does not offer seller onboarding or fetch status for %j",
    (role) => {
      useAuthStore.getState().setUser(role ? { ...account, ...role } : null);
      render(<ProfileCard />);
      expect(
        screen.queryByRole("region", { name: "Selling on MallByte" }),
      ).not.toBeInTheDocument();
      expect(mock.history.get).toHaveLength(0);
    },
  );

  it.each([401, 403, 500, "network", "unexpected status"] as const)(
    "offers a retry without an application link after %s",
    async (failure) => {
      const initial = mock.onGet(statusUrl);
      if (failure === "network") initial.networkErrorOnce();
      else if (failure === "unexpected status")
        initial.replyOnce(200, { status: "none" });
      else initial.replyOnce(failure);
      mock.onGet(statusUrl).reply(200, { status: "pending" });
      render(<ProfileCard />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /could not check/i,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      await userEvent.click(
        screen.getByRole("button", { name: "Retry seller status" }),
      );
      expect(
        await screen.findByRole("link", { name: "View Application Status" }),
      ).toHaveAttribute("href", "/seller/status");
      expect(
        mock.history.get.filter(({ url }) => url === statusUrl),
      ).toHaveLength(2);
    },
  );

  it("shows loading and shares one lookup across Strict Mode effect replays", async () => {
    let finish!: (response: [number, object]) => void;
    mock.onGet(statusUrl).reply(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <StrictMode>
        <ProfileCard />
      </StrictMode>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /checking your seller status/i,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await act(async () => finish([200, { status: "pending" }]));
    expect(
      screen.getByRole("link", { name: "View Application Status" }),
    ).toBeInTheDocument();
    expect(mock.history.get).toHaveLength(1);
  });

  it("ignores an old account's late response after switching accounts", async () => {
    let finish!: (response: [number, object]) => void;
    mock.onGet(statusUrl).replyOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    mock.onGet(statusUrl).reply(200, { status: "suspended" });
    render(<ProfileCard />);
    act(() => useAuthStore.getState().setUser({ ...account, id: 8 }));
    await screen.findByRole("link", { name: "View Seller Status" });
    await act(async () => finish([404, {}]));
    expect(
      screen.getByRole("link", { name: "View Seller Status" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Become a Seller" }),
    ).not.toBeInTheDocument();
  });
});

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { getUnreadNotificationCount } from "../api";
import { useNotificationStore } from "../notification-store";
import { invalidateSession } from "@/lib/auth/session-storage";

vi.mock("../api", () => ({
  getUnreadNotificationCount: vi.fn(),
}));

const mockedGetUnreadCount = vi.mocked(
  getUnreadNotificationCount,
);

describe("notification store", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useNotificationStore.setState({
      unreadCount: 0,
      isRefreshing: false,
    });
  });

  it("refreshes unread count from the API", async () => {
    mockedGetUnreadCount.mockResolvedValue(7);

    await useNotificationStore
      .getState()
      .refreshUnreadCount();

    expect(
      mockedGetUnreadCount,
    ).toHaveBeenCalledTimes(1);

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(7);

    expect(
      useNotificationStore.getState().isRefreshing,
    ).toBe(false);
  });

  it("does not start a second refresh while one is already running", async () => {
    let resolveCount!: (value: number) => void;

    mockedGetUnreadCount.mockReturnValue(
      new Promise<number>((resolve) => {
        resolveCount = resolve;
      }),
    );

    const firstRefresh = useNotificationStore
      .getState()
      .refreshUnreadCount();

    const secondRefresh = useNotificationStore
      .getState()
      .refreshUnreadCount();

    expect(
      mockedGetUnreadCount,
    ).toHaveBeenCalledTimes(1);

    resolveCount(4);

    await Promise.all([
      firstRefresh,
      secondRefresh,
    ]);

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(4);
  });

  it("preserves the last known count when background polling fails and can retry", async () => {
    useNotificationStore.getState().setUnreadCount(5);
    mockedGetUnreadCount.mockRejectedValueOnce(new Error("Temporary API outage"));
    // Bell callers do not await this promise; a failure must not reject.
    await expect(
      useNotificationStore.getState().refreshUnreadCount(),
    ).resolves.toBeUndefined();
    expect(useNotificationStore.getState().unreadCount).toBe(5);
    expect(useNotificationStore.getState().isRefreshing).toBe(false);

    mockedGetUnreadCount.mockResolvedValueOnce(2);
    await useNotificationStore.getState().refreshUnreadCount();
    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(2);
    expect(useNotificationStore.getState().unreadCount).toBe(2);
    expect(useNotificationStore.getState().isRefreshing).toBe(false);
  });

  it("never lets unread count go below zero", () => {
    useNotificationStore
      .getState()
      .setUnreadCount(-10);

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(0);

    useNotificationStore
      .getState()
      .incrementUnreadCount(3);

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(3);

    useNotificationStore
      .getState()
      .decrementUnreadCount(10);

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(0);

    useNotificationStore
      .getState()
      .decrementUnreadCount();

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(0);
  });

  it("does not restore the previous user's count from a request pending during logout", async () => {
    let resolveCount!: (value: number) => void;
    mockedGetUnreadCount.mockReturnValue(new Promise<number>((resolve) => { resolveCount = resolve; }));
    const request = useNotificationStore.getState().refreshUnreadCount();
    invalidateSession("logout");
    useNotificationStore.getState().reset();
    resolveCount(8);
    await request;
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(useNotificationStore.getState().isRefreshing).toBe(false);
  });
});

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
  it("does not let an older unread-count poll overwrite a completed read mutation", async () => {
    let resolve!: (value: number) => void;
    mockedGetUnreadCount.mockReturnValueOnce(
      new Promise<number>((res) => {
        resolve = res;
      }),
    );
    const poll = useNotificationStore.getState().refreshUnreadCount();
    useNotificationStore.getState().setUnreadCount(0);
    resolve(12);
    await poll;
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("can refresh after a mutation supersedes an in-flight poll, ignoring reversed completion", async () => {
    let oldResolve!: (value: number) => void;
    let newResolve!: (value: number) => void;
    mockedGetUnreadCount
      .mockReturnValueOnce(
        new Promise<number>((res) => {
          oldResolve = res;
        }),
      )
      .mockReturnValueOnce(
        new Promise<number>((res) => {
          newResolve = res;
        }),
      );
    const old = useNotificationStore.getState().refreshUnreadCount();
    useNotificationStore.getState().decrementUnreadCount();
    const current = useNotificationStore.getState().refreshUnreadCount();
    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(2);
    newResolve(3);
    await current;
    oldResolve(9);
    await old;
    expect(useNotificationStore.getState()).toMatchObject({
      unreadCount: 3,
      isRefreshing: false,
    });
  });

  it("retires polls on reset even without a session change", async () => {
    let oldResolve!: (value: number) => void;
    let newResolve!: (value: number) => void;
    mockedGetUnreadCount
      .mockReturnValueOnce(
        new Promise<number>((res) => {
          oldResolve = res;
        }),
      )
      .mockReturnValueOnce(
        new Promise<number>((res) => {
          newResolve = res;
        }),
      );
    const old = useNotificationStore.getState().refreshUnreadCount();
    useNotificationStore.getState().reset();
    const current = useNotificationStore.getState().refreshUnreadCount();
    oldResolve(9);
    await old;
    expect(useNotificationStore.getState()).toMatchObject({
      unreadCount: 0,
      isRefreshing: true,
    });
    newResolve(2);
    await current;
    expect(useNotificationStore.getState()).toMatchObject({
      unreadCount: 2,
      isRefreshing: false,
    });
  });
});

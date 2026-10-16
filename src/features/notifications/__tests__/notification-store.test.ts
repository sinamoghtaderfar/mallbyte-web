import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { getUnreadNotificationCount } from "../api";
import { useNotificationStore } from "../notification-store";

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
});
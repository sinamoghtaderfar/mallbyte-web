import { create } from "zustand";

import { getUnreadNotificationCount } from "./api";
import { getSessionGeneration, isCurrentSession } from "@/lib/auth/session-storage";

type NotificationStore = {
  unreadCount: number;
  isRefreshing: boolean;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: (amount?: number) => void;
  decrementUnreadCount: (amount?: number) => void;
  refreshUnreadCount: () => Promise<void>;
  reset: () => void;
};

let countRevision = 0;
let refreshId = 0;
let pendingRefresh: {
  revision: number;
  session: number;
  promise: Promise<void>;
} | null = null;

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  isRefreshing: false,
  reset: () => {
    countRevision += 1;
    refreshId += 1;
    pendingRefresh = null;
    set({ unreadCount: 0, isRefreshing: false });
  },

  setUnreadCount: (count) => {
    countRevision += 1;
    set({ unreadCount: Math.max(0, count) });
  },

  incrementUnreadCount: (amount = 1) => {
    countRevision += 1;
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount + amount) }));
  },

  decrementUnreadCount: (amount = 1) => {
    countRevision += 1;
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - amount) }));
  },

  refreshUnreadCount: async () => {
    const generation = getSessionGeneration();
    const revision = countRevision;
    if (pendingRefresh?.revision === revision && pendingRefresh.session === generation) {
      return pendingRefresh.promise;
    }
    const request = ++refreshId;
    set({ isRefreshing: true });
    const promise = (async () => {
      try {
        const unreadCount = await getUnreadNotificationCount();
        if (
          request === refreshId && revision === countRevision &&
          isCurrentSession(generation)
        ) {
          set({ unreadCount: Math.max(0, unreadCount) });
        }
      } catch {
        // Background polling is best-effort; retain the count and allow retry.
      } finally {
        if (request === refreshId && isCurrentSession(generation)) {
          set({ isRefreshing: false });
          pendingRefresh = null;
        }
      }
    })();
    pendingRefresh = { revision, session: generation, promise };
    return promise;
  },
}));

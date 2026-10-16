import { create } from "zustand";

import { getUnreadNotificationCount } from "./api";

type NotificationStore = {
  unreadCount: number;
  isRefreshing: boolean;

  setUnreadCount: (count: number) => void;
  incrementUnreadCount: (amount?: number) => void;
  decrementUnreadCount: (amount?: number) => void;
  refreshUnreadCount: () => Promise<void>;
};

export const useNotificationStore = create<NotificationStore>(
  (set, get) => ({
    unreadCount: 0,
    isRefreshing: false,

    setUnreadCount: (count) => {
      set({
        unreadCount: Math.max(0, count),
      });
    },

    incrementUnreadCount: (amount = 1) => {
      set((state) => ({
        unreadCount: Math.max(
          0,
          state.unreadCount + amount,
        ),
      }));
    },

    decrementUnreadCount: (amount = 1) => {
      set((state) => ({
        unreadCount: Math.max(
          0,
          state.unreadCount - amount,
        ),
      }));
    },

    refreshUnreadCount: async () => {
      if (get().isRefreshing) {
        return;
      }

      set({ isRefreshing: true });

      try {
        const unreadCount =
          await getUnreadNotificationCount();

        set({
          unreadCount: Math.max(
            0,
            unreadCount,
          ),
        });
      } finally {
        set({ isRefreshing: false });
      }
    },
  }),
);
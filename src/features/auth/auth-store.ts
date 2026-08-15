import { create } from "zustand";

import type { AuthUser } from "./types";

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBootstrapped: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
  setBootstrapped: (isBootstrapped: boolean) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isBootstrapped: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
    }),

  setLoading: (isLoading) =>
    set({
      isLoading,
    }),

  setBootstrapped: (isBootstrapped) =>
    set({
      isBootstrapped,
    }),

  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));

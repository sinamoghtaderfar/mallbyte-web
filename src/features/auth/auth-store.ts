import { create } from "zustand";

import type { AuthUser } from "./types";

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBootstrapped: boolean;
  sessionIssue: "expired" | "logout-unconfirmed" | null;
  isSigningOut: boolean;
  setSessionIssue: (issue: AuthState["sessionIssue"]) => void;
  setSigningOut: (value: boolean) => void;
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
  sessionIssue: null,
  isSigningOut: false,
  setSessionIssue: (sessionIssue) => set({ sessionIssue }),
  setSigningOut: (isSigningOut) => set({ isSigningOut }),

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

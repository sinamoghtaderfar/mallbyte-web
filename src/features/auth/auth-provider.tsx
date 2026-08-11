"use client";

import { useEffect, useRef } from "react";

import { clearSession } from "@/lib/auth/session-storage";

import { getProfile, refreshSession } from "./api";
import { useAuthStore } from "./auth-store";

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const hasBootstrapped = useRef(false);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;

    async function bootstrapSession() {
      setLoading(true);

      try {
        await refreshSession();

        const profile = await getProfile();
        setUser(profile.user);
      } catch {
        clearSession();
        clearAuth();
      } finally {
        setLoading(false);
      }
    }

    bootstrapSession();
  }, [clearAuth, setLoading, setUser]);

  return children;
}

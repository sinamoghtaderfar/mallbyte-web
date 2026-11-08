"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  getLogoutStatus,
  getSessionGeneration,
  invalidateSession,
  isCurrentSession,
  isSessionRestorationBlocked,
  listenForSessionChanges,
  subscribeToSessionInvalidation,
} from "@/lib/auth/session-storage";
import { useCartStore } from "@/features/cart/cart-store";
import { useNotificationStore } from "@/features/notifications/notification-store";
import { getProfile, refreshSession } from "./api";
import { useAuthStore } from "./auth-store";
import { SessionRecoveryNotice } from "./components/session-recovery-notice";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasBootstrapped = useRef(false);
  const mounted = useRef(false);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    mounted.current = true;
    function clearPrivateState(reason: "logout" | "expired" | "external") {
      const hadIdentity = useAuthStore.getState().isAuthenticated;
      useAuthStore.getState().clearAuth();
      useCartStore.getState().clearCartState();
      useNotificationStore.getState().reset();
      useAuthStore
        .getState()
        .setSessionIssue(
          reason === "expired" && hadIdentity
            ? "expired"
            : getLogoutStatus() === "pending"
              ? "logout-unconfirmed"
              : null,
        );
      setSessionKey((key) => key + 1);
    }
    const unsubscribe = subscribeToSessionInvalidation(clearPrivateState);
    const stopListening = listenForSessionChanges();

    async function bootstrapSession() {
      const state = useAuthStore.getState();
      state.setLoading(true);
      state.setBootstrapped(false);
      const generation = getSessionGeneration();
      try {
        if (isSessionRestorationBlocked()) {
          clearPrivateState("logout");
          return;
        }
        await refreshSession();
        if (!mounted.current || !isCurrentSession(generation)) return;
        const profile = await getProfile();
        if (mounted.current && isCurrentSession(generation))
          state.setUser(profile.user);
      } catch {
        if (mounted.current && isCurrentSession(generation))
          invalidateSession("external");
      } finally {
        if (mounted.current) {
          state.setLoading(false);
          state.setBootstrapped(true);
        }
      }
    }

    if (!hasBootstrapped.current) {
      hasBootstrapped.current = true;
      void bootstrapSession();
    }
    return () => {
      mounted.current = false;
      unsubscribe();
      stopListening();
    };
  }, []);

  return (
    <>
      <SessionRecoveryNotice />
      <Fragment key={sessionKey}>{children}</Fragment>
    </>
  );
}

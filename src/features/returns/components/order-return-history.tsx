"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getSessionGeneration, isCurrentSession, subscribeToSessionInvalidation } from "@/lib/auth/session-storage";
import { getReturnsPage } from "../api";
import type { ReturnListItem } from "../types";

type History = { returns: ReturnListItem[]; count: number; complete: boolean; loading: boolean; error: string; attempted: boolean };
type SharedHistory = History & { ensureLoaded: () => void };
const initial: History = { returns: [], count: 0, complete: false, loading: false, error: "", attempted: false };
const Context = createContext<SharedHistory | null>(null);

/** One history query per order page, with explicit bounded continuation. */
export function OrderReturnHistory({ children }: { children: ReactNode }) {
  const userId = useAuthStore((state) => state.user?.id);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  return <HistoryProvider key={`${userId}:${authenticated}:${getSessionGeneration()}`}>{children}</HistoryProvider>;
}

function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<History>(initial);
  const snapshot = useRef(initial);
  const nextPage = useRef<number | null>(1);
  const pending = useRef<Promise<void> | null>(null);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const publish = useCallback((value: History) => { snapshot.current = value; setHistory(value); }, []);
  const loadPage = useCallback(() => {
    if (pending.current || nextPage.current === null) return;
    const page = nextPage.current;
    const session = getSessionGeneration();
    const id = ++request.current;
    const abort = new AbortController();
    controller.current = abort;
    publish({ ...snapshot.current, loading: true, error: "", attempted: true });
    const operation = (async () => {
      try {
        const result = await getReturnsPage(page, abort.signal);
        if (request.current !== id || !isCurrentSession(session)) return;
        const rows = new Map(snapshot.current.returns.map((item) => [item.id, item]));
        result.results.forEach((item) => rows.set(item.id, item));
        nextPage.current = result.next ? page + 1 : null;
        publish({ returns: [...rows.values()], count: result.count, complete: !result.next, loading: false, error: "", attempted: true });
      } catch (reason) {
        if (request.current === id && isCurrentSession(session)) publish({ ...snapshot.current, loading: false, error: getApiErrorMessage(reason) });
      } finally {
        if (request.current === id) pending.current = null;
      }
    })();
    pending.current = operation;
  }, [publish]);
  const ensureLoaded = useCallback(() => {
    if (!snapshot.current.attempted) loadPage();
  }, [loadPage]);
  useEffect(() => {
    const unsubscribe = subscribeToSessionInvalidation(() => {
      request.current += 1;
      controller.current?.abort();
      pending.current = null;
      nextPage.current = 1;
      publish(initial);
    });
    return () => {
      unsubscribe();
      request.current += 1;
      controller.current?.abort();
      pending.current = null;
      nextPage.current = 1;
      snapshot.current = initial;
    };
  }, [publish]);
  return <Context.Provider value={{ ...history, ensureLoaded }}>
    {children}
    {history.attempted && (!history.complete || history.loading || history.error) && <aside aria-label="Order return history" className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
      {history.loading ? <p role="status">Checking return history…</p> : history.error ? <p role="alert">Return history could not be checked: {history.error}</p> : !history.complete ? <p>Return statuses reflect {history.returns.length} of {history.count} checked requests. More return history has not been checked.</p> : null}
      {!history.complete && <button type="button" disabled={history.loading} onClick={loadPage} className="mt-2 rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-50">{history.error ? "Retry return history" : "Check more return history"}</button>}
    </aside>}
  </Context.Provider>;
}

export function useOrderReturnHistory() {
  const history = useContext(Context);
  const ensureLoaded = history?.ensureLoaded;
  useEffect(() => { ensureLoaded?.(); }, [ensureLoaded]);
  return history;
}

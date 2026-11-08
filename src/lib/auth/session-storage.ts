let accessToken: string | null = null;
let generation = 0;
let observedMarker: string | null | undefined;
let memoryMarker: string | null = null;
let storageAvailable: boolean | undefined;

// Only logout intent is persisted. Credentials and user data remain in memory.
export const LOGOUT_STORAGE_KEY = "mallbyte:logout";
export type SessionInvalidationReason = "logout" | "expired" | "external";
const listeners = new Set<(reason: SessionInvalidationReason) => void>();

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    if (storageAvailable === undefined) {
      const probe = `${LOGOUT_STORAGE_KEY}:probe`;
      storage.setItem(probe, "1".repeat(128));
      storage.removeItem(probe);
      storageAvailable = true;
    }
    return storage;
  } catch {
    storageAvailable = false;
    return null;
  }
}

function synchronizeMarker(value: string | null) {
  const changed = observedMarker !== undefined && observedMarker !== value;
  observedMarker = value;
  memoryMarker = value;
  if (changed) invalidateSession("external");
  return value;
}

function readMarker(): string | null {
  const storage = browserStorage();
  if (!storage || storageAvailable === false) return memoryMarker;
  try {
    return synchronizeMarker(storage.getItem(LOGOUT_STORAGE_KEY));
  } catch {
    storageAvailable = false;
    return memoryMarker;
  }
}

function writeMarker(value: string | null) {
  observedMarker = value;
  memoryMarker = value;
  try {
    const storage = browserStorage();
    if (value === null) storage?.removeItem(LOGOUT_STORAGE_KEY);
    else storage?.setItem(LOGOUT_STORAGE_KEY, value);
  } catch {
    storageAvailable = false;
  }
}

export function getAccessToken(): string | null {
  readMarker();
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearSession(): void {
  accessToken = null;
  generation += 1;
}

export function getSessionGeneration(): number {
  readMarker();
  return generation;
}

export function isCurrentSession(expected: number): boolean {
  return getSessionGeneration() === expected;
}

export function getLogoutStatus(): "pending" | "confirmed" | null {
  const marker = readMarker();
  return marker === null
    ? null
    : marker.startsWith("confirmed:")
      ? "confirmed"
      : "pending";
}

export function isSessionRestorationBlocked(): boolean {
  const marker = readMarker();
  // Without durable storage, require an explicit login after each reload.
  return (
    marker !== null ||
    (typeof window !== "undefined" &&
      storageAvailable === false &&
      accessToken === null)
  );
}

export function invalidateSession(reason: SessionInvalidationReason): void {
  clearSession();
  for (const listener of listeners) listener(reason);
}

export function beginLogout(): number {
  const alreadySignedOut = readMarker() !== null && accessToken === null;
  if (!alreadySignedOut) {
    writeMarker(`pending:${crypto.randomUUID()}`);
    invalidateSession("logout");
  }
  return generation;
}

export function confirmLogout(expected: number): void {
  if (isCurrentSession(expected)) {
    writeMarker(
      `confirmed:${memoryMarker?.split(":").slice(1).join(":") ?? crypto.randomUUID()}`,
    );
  }
}

export function establishSession(token: string, expected: number): boolean {
  if (!isCurrentSession(expected)) return false;
  // Retire older requests without remounting the MFA recovery-code screen.
  generation += 1;
  writeMarker(null);
  accessToken = token;
  return true;
}

export function subscribeToSessionInvalidation(
  listener: (reason: SessionInvalidationReason) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function listenForSessionChanges() {
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOGOUT_STORAGE_KEY || event.key === null) {
      synchronizeMarker(event.key === null ? null : event.newValue);
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

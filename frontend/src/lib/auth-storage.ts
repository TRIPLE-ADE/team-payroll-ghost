const STORAGE_KEY = "payroll-ghost-access-token";

type Listener = () => void;

let cachedToken: string | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn();
}

function readFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToStorage(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token == null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, token);
    }
  } catch {
    /* storage disabled — keep in-memory state */
  }
}

export function hydrateAuth() {
  if (hydrated || typeof window === "undefined") return;
  cachedToken = readFromStorage();
  hydrated = true;
  emit();
}

export function getAccessToken(): string | null {
  return cachedToken;
}

export function isAuthHydrated(): boolean {
  return hydrated;
}

export function setAccessToken(token: string | null) {
  if (cachedToken === token) return;
  cachedToken = token;
  writeToStorage(token);
  emit();
}

export function clearAccessToken() {
  setAccessToken(null);
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    cachedToken = e.newValue;
    emit();
  });
}

export const AUTH_STORAGE_KEY = STORAGE_KEY;

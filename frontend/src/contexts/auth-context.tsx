"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  clearAccessToken as clearAccessTokenStore,
  getAccessToken,
  hydrateAuth,
  isAuthHydrated,
  setAccessToken as setAccessTokenStore,
  subscribeAuth,
} from "@/lib/auth-storage";

type AuthContextValue = {
  accessToken: string | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const getTokenSnapshot = () => getAccessToken();
const getTokenServerSnapshot = () => null;

const getHydratedSnapshot = () => isAuthHydrated();
const getHydratedServerSnapshot = () => false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateAuth();
  }, []);

  const accessToken = useSyncExternalStore(
    subscribeAuth,
    getTokenSnapshot,
    getTokenServerSnapshot,
  );

  const hydrated = useSyncExternalStore(
    subscribeAuth,
    getHydratedSnapshot,
    getHydratedServerSnapshot,
  );

  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenStore(token);
  }, []);

  const clearAuth = useCallback(() => {
    clearAccessTokenStore();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      hydrated,
      isAuthenticated: hydrated && accessToken != null,
      setAccessToken,
      clearAuth,
    }),
    [accessToken, hydrated, setAccessToken, clearAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

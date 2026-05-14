import axios, { isAxiosError } from "axios";

import { clearAccessToken, getAccessToken } from "@/lib/auth-storage";

function apiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return raw.replace(/\/+$/, "");
}

export const http = axios.create({
  baseURL: apiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  }, 
  timeout: 30_000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
});

function isAuthLoginRequest(config: { method?: string; url?: string }): boolean {
  const method = config.method?.toLowerCase() ?? "";
  const url = config.url ?? "";
  return method === "post" && url.includes("/auth/login");
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!isAxiosError(error)) return Promise.reject(error);
    const status = error.response?.status;
    const cfg = error.config;
    if (status === 401 && cfg && !isAuthLoginRequest(cfg)) {
      clearAccessToken();
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (!path.startsWith("/login")) {
          window.location.assign("/login");
        }
      }
    }
    return Promise.reject(error);
  },
);

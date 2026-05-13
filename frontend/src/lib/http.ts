import axios from "axios";

import { getAccessToken } from "@/lib/auth-storage";

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
  return config;
});

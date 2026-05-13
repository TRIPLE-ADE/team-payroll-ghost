import { isAxiosError } from "axios";

/** Normalizes Axios / backend errors into a single user-facing string. */
export function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { detail?: unknown } | undefined;
    const detail = data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map(String).join(" · ");
    if (err.response?.status === 401) return "Invalid email or password.";
    return err.message || "Request failed.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Try again.";
}

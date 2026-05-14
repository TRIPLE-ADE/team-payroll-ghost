/** Decode JWT payload (no signature verification; UI-only). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(pad);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function emailFromAccessToken(token: string | null): string | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  if (typeof payload.email === "string" && payload.email.includes("@")) {
    return payload.email;
  }
  if (typeof payload.sub === "string" && payload.sub.includes("@")) {
    return payload.sub;
  }
  return null;
}

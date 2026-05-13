"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useSystemSettings } from "@/hooks/use-domain-queries";
import { cn } from "@/lib/utils";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
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

function truncateLabel(label: string, max: number): string {
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

function pickDisplayName(payload: Record<string, unknown> | null): string {
  if (!payload) return "Account";
  const email =
    typeof payload.email === "string"
      ? payload.email
      : typeof payload.sub === "string" && payload.sub.includes("@")
        ? payload.sub
        : null;
  if (email) {
    const local = email.split("@")[0] ?? email;
    return truncateLabel(local, 24);
  }
  if (typeof payload.sub === "string" && payload.sub.length > 0) {
    return truncateLabel(payload.sub, 28);
  }
  return "Account";
}

function initialsFromLabel(label: string): string {
  const clean = label.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function AppShellProfileMenu() {
  const menuId = useId();
  const router = useRouter();
  const { accessToken, clearAuth } = useAuth();
  const { data: settings } = useSystemSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const payload = accessToken ? decodeJwtPayload(accessToken) : null;
  const institution = settings?.institutionName?.trim() ?? "";
  const displayName =
    institution.length > 0
      ? truncateLabel(institution, 40)
      : pickDisplayName(payload);
  const initials = initialsFromLabel(displayName);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  function onLogout() {
    close();
    clearAuth();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={`${menuId}-trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${menuId}-menu` : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-2 text-left text-sm",
          "text-foreground outline-none ring-ring hover:bg-muted/80 focus-visible:ring-2",
        )}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background"
          aria-hidden
        >
          {initials}
        </span>
        <span className="hidden max-w-40 truncate font-mono text-[11px] text-muted-foreground sm:inline">
          {displayName}
        </span>
      </button>

      {open ? (
        <div
          id={`${menuId}-menu`}
          role="menu"
          aria-labelledby={`${menuId}-trigger`}
          className={cn(
            "absolute right-0 top-full z-50 mt-1.5 min-w-48 rounded-lg border border-border bg-card py-1 shadow-lg",
          )}
        >
          <div className="border-b border-border px-3 py-2 sm:hidden">
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {displayName}
            </p>
          </div>
          <Link
            href="/settings"
            role="menuitem"
            className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
            onClick={close}
          >
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

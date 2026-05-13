"use client";

import Link from "next/link";
import { memo } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";

import { cn } from "@/lib/utils";

export const APP_SHELL_NAV = [
  { href: "/dashboard", match: "/dashboard", label: "Operations dashboard" },
  { href: "/payroll", match: "/payroll", label: "Payroll cycles" },
  { href: "/employees", match: "/employees", label: "Employees" },
  { href: "/investigations", match: "/investigations", label: "Investigations" },
  { href: "/payments", match: "/payments", label: "Payments" },
  { href: "/relationships", match: "/relationships", label: "Relationships" },
  { href: "/audit", match: "/audit", label: "Audit timeline" },
  { href: "/settings", match: "/settings", label: "Settings" },
] as const;


function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

const SidebarNavLinks = memo(function SidebarNavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <>
      {APP_SHELL_NAV.map((item) => {
        const active =
          item.match === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
});

export const AppShellSidebar = memo(function AppShellSidebar({
  pathname,
  mobileNavOpen,
  sidebarInert,
  onDismiss,
}: {
  pathname: string;
  mobileNavOpen: boolean;
  sidebarInert: boolean;
  onDismiss: () => void;
}) {
  return (
    <aside
      id="app-shell-sidebar"
      inert={sidebarInert}
      className={cn(
        "grid min-h-0 shrink-0 grid-rows-[auto_minmax(0,1fr)_auto] border-r border-border bg-surface",
        "fixed left-0 top-0 z-50 h-dvh max-h-dvh w-[min(100vw-3rem,16rem)] transition-transform duration-200 ease-out",
        "md:static md:top-auto md:z-auto md:h-dvh md:max-h-dvh md:w-56 md:self-stretch md:translate-x-0 md:transition-none md:shadow-none",
        mobileNavOpen
          ? "translate-x-0 shadow-2xl shadow-black/20 dark:shadow-black/40"
          : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-4">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Workforce integrity
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight text-foreground">
            PayGuard
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Pre-payment operations
          </div>
        </div>
        <button
          type="button"
          className="-m-1 shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Close navigation"
          onClick={onDismiss}
        >
          <CloseIcon />
        </button>
      </div>

      <nav
        className="min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-2 scrollbar-gutter-stable"
        aria-label="Main"
      >
        <div className="flex flex-col gap-0.5">
          <SidebarNavLinks pathname={pathname} onNavigate={onDismiss} />
        </div>
      </nav>

      <div className="shrink-0 border-t border-border p-3 text-[10px] leading-snug text-subtle-foreground">
        Operational view · institutional mode
      </div>
    </aside>
  );
});

export function AppShellHeader({
  mobileNavOpen,
  onToggleNav,
}: {
  mobileNavOpen: boolean;
  onToggleNav: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/70 md:px-6">
      <button
        type="button"
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        aria-expanded={mobileNavOpen}
        aria-controls="app-shell-sidebar"
        aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={onToggleNav}
      >
        {mobileNavOpen ? (
          <CloseIcon className="h-5 w-5" />
        ) : (
          <MenuIcon className="h-5 w-5" />
        )}
      </button>
      <span className="font-mono text-xs text-muted-foreground">
        PayGuard · <span className="text-amber-500 dark:text-amber-500/80">SANDBOX</span>
      </span>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}

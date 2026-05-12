"use client";

import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";

import { AppShellHeader, AppShellSidebar } from "@/components/AppShellSidebar";

const ShellMain = memo(function ShellMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>
  );
});

export const AppShellLayout = memo(function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [routeKey, setRouteKey] = useState(pathname);

  if (pathname !== routeKey) {
    setRouteKey(pathname);
    setMobileNavOpen(false);
  }

  const dismissNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const toggleNav = useCallback(() => {
    setMobileNavOpen((o) => !o);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setMobileNavOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const sidebarInert = !isDesktop && !mobileNavOpen;

  return (
    <div className="relative flex h-dvh max-h-dvh min-h-0 flex-1 flex-col items-stretch overflow-hidden bg-zinc-950 text-zinc-100 md:flex-row">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
          aria-label="Close navigation"
          onClick={dismissNav}
        />
      ) : null}

      <AppShellSidebar
        pathname={pathname}
        mobileNavOpen={mobileNavOpen}
        sidebarInert={sidebarInert}
        onDismiss={dismissNav}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppShellHeader mobileNavOpen={mobileNavOpen} onToggleNav={toggleNav} />
        <ShellMain>{children}</ShellMain>
      </div>
    </div>
  );
});

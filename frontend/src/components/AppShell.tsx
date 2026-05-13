"use client";

import { AppShellLayout } from "@/components/AppShellLayout";
import { RequireAuth } from "@/components/RequireAuth";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShellLayout>{children}</AppShellLayout>
    </RequireAuth>
  );
}

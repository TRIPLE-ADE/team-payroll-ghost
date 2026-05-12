"use client";

import { AppShellLayout } from "@/components/AppShellLayout";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellLayout>{children}</AppShellLayout>;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/contexts/auth-context";

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) router.replace("/dashboard");
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || isAuthenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}

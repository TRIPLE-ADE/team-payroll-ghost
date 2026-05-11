"use client";

import { useEffect, useState } from "react";

export function ClientOnlyChart({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  if (!ready) {
    return <div className="h-full min-h-[240px] w-full min-w-0 rounded bg-zinc-900/40" />;
  }
  return <>{children}</>;
}

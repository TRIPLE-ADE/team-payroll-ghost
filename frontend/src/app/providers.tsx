"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useState } from "react";
import { Toaster, type ToasterProps } from "sonner";

import { AuthProvider } from "@/contexts/auth-context";

function AppToaster() {
  const { theme } = useTheme();
  const resolved: ToasterProps["theme"] =
    theme === "light" || theme === "dark" ? theme : "system";

  return (
    <Toaster richColors theme={resolved} position="top-center" closeButton />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={client}>
        <AuthProvider>
          {children}
          <AppToaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

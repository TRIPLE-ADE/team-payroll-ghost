"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", match: "/dashboard", label: "Operations dashboard" },
  { href: "/payroll", match: "/payroll", label: "Payroll cycles" },
  { href: "/employees", match: "/employees", label: "Employees" },
  { href: "/investigations", match: "/investigations", label: "Investigations" },
  { href: "/payments", match: "/payments", label: "Payments" },
  { href: "/relationships", match: "/relationships", label: "Relationships" },
  { href: "/audit", match: "/audit", label: "Audit timeline" },
  { href: "/settings", match: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 bg-zinc-950 text-zinc-100">
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950">
        <div className="border-b border-zinc-800/80 px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Workforce integrity
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight text-zinc-100">
            Payroll Ghost
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            Pre-payment operations
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {navItems.map((item) => {
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
                    ? "bg-zinc-800/80 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-800/80 p-3 text-[10px] text-zinc-600">
          Desktop operational view · institutional mode
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center border-b border-zinc-800/80 bg-zinc-950 px-6">
          <span className="font-mono text-xs text-zinc-500">
            ENV / <span className="text-amber-500/80">SANDBOX</span> · MOCK DATA
          </span>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

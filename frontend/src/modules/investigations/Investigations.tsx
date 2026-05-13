"use client";

import Link from "next/link";

import { RiskBadge } from "@/components/RiskBadge";
import { SectionTitle } from "@/components/SectionTitle";
import { useInvestigations } from "@/hooks/use-domain-queries";
import { getApiErrorMessage } from "@/lib/axios-error";

export function InvestigationsIndex() {
  const { data, isLoading, isError, error, refetch } = useInvestigations();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <SectionTitle eyebrow="Investigations" title="Active integrity reviews" />
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <SectionTitle eyebrow="Investigations" title="Active integrity reviews" />
        <div className="rounded-xl border border-border bg-card px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">{getApiErrorMessage(error)}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const list = data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SectionTitle eyebrow="Investigations" title="Active integrity reviews" />
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {list.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-foreground">{inv.id}</span>
                <RiskBadge
                  level={
                    inv.timeline.some((t) => t.severity === "high")
                      ? "high"
                      : "medium"
                  }
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Employee {inv.employeeId} · {inv.status.replace(/_/g, " ")}
              </p>
            </div>
            <Link
              href={`/investigations/${inv.id}`}
              className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-foreground hover:bg-muted"
            >
              Workspace
            </Link>
          </li>
        ))}
      </ul>
      {!list.length ? (
        <p className="text-center text-sm text-muted-foreground">No investigations.</p>
      ) : null}
    </div>
  );
}

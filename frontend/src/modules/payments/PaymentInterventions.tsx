"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SectionTitle } from "@/components/SectionTitle";
import { usePaymentInterventions } from "@/hooks/use-domain-queries";
import { getApiErrorMessage } from "@/lib/axios-error";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import type { PaymentInterventionRow } from "@/types/domain";

function stateLabel(s: PaymentInterventionRow["state"]) {
  switch (s) {
    case "paused":
      return "Paused (Squad hold)";
    case "released":
      return "Released";
    case "escalated":
      return "Escalated";
    default:
      return "Pending review";
  }
}

export function PaymentInterventions() {
  const { data, isPending, isError, error, isFetching } =
    usePaymentInterventions();
  const [filter, setFilter] = useState<PaymentInterventionRow["state"] | "all">(
    "all",
  );

  const rows = useMemo(() => {
    const r = data ?? [];
    if (filter === "all") return r;
    return r.filter((x) => x.state === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    const r = data ?? [];
    return {
      all: r.length,
      paused: r.filter((x) => x.state === "paused").length,
      released: r.filter((x) => x.state === "released").length,
      escalated: r.filter((x) => x.state === "escalated").length,
      pending: r.filter((x) => x.state === "pending").length,
    };
  }, [data]);

  const tabs: { key: PaymentInterventionRow["state"] | "all"; label: string }[] =
    useMemo(
      () => [
        { key: "all" as const, label: isPending ? "All" : `All (${counts.all})` },
        {
          key: "paused" as const,
          label: isPending ? "Paused" : `Paused (${counts.paused})`,
        },
        {
          key: "pending" as const,
          label: isPending ? "Pending" : `Pending (${counts.pending})`,
        },
        {
          key: "released" as const,
          label: isPending ? "Released" : `Released (${counts.released})`,
        },
        {
          key: "escalated" as const,
          label: isPending ? "Escalated" : `Escalated (${counts.escalated})`,
        },
      ],
      [counts, isPending],
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SectionTitle
        eyebrow="Treasury · Squad"
        title="Payment intervention monitor"
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={cn(
              "rounded-md border px-3 py-1.5 font-mono text-xs",
              filter === t.key
                ? "border-zinc-200 bg-zinc-800 text-zinc-50"
                : "border-zinc-700 text-zinc-400 hover:bg-zinc-900",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isFetching && !isPending ? (
        <div className="mb-1 flex items-center justify-end">
          <span className="font-mono text-[10px] text-zinc-500">Refreshing…</span>
        </div>
      ) : null}

      <div className="space-y-4">
        {isPending ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            Loading interventions…
          </p>
        ) : isError ? (
          <p className="py-12 text-center text-sm text-red-400">
            {getApiErrorMessage(error)}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            {(data ?? []).length === 0
              ? "No interventions in queue."
              : "No rows for this filter."}
          </p>
        ) : (
          rows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-medium text-zinc-100">
                      {row.employeeName}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {row.employeeId}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    {row.cycleLabel} · Net {formatCurrency(row.netAmount)}
                  </p>
                  <p className="mt-1 text-sm text-amber-100/90">
                    {stateLabel(row.state)}
                  </p>
                  {row.squadRef ? (
                    <p className="mt-1 font-mono text-[11px] text-zinc-400">
                      {row.squadRef}
                    </p>
                  ) : null}
                </div>
                <div className="text-right font-mono text-[11px] text-zinc-500">
                  Updated {formatShortDate(row.updatedAt)}
                  <div className="mt-2 flex flex-col gap-1">
                    <Link
                      href={`/payroll/review/${row.cycleId}`}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      Cycle review →
                    </Link>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-zinc-800/80 pt-3">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Intervention history
                </h3>
                <ul className="mt-2 space-y-2">
                  {row.history.map((h, i) => (
                    <li
                      key={`${h.at}-${i}`}
                      className="flex flex-wrap gap-2 text-xs text-zinc-400"
                    >
                      <span className="font-mono text-zinc-500">
                        {formatShortDate(h.at)}
                      </span>
                      <span className="text-zinc-300">{h.action}</span>
                      {h.actor ? (
                        <span className="font-mono text-zinc-600">{h.actor}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

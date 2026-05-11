"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { SectionTitle } from "@/components/SectionTitle";
import { useAuditEvents } from "@/hooks/use-domain-queries";
import { cn, formatShortDate } from "@/lib/utils";
import type { AuditEventType } from "@/types/domain";

const typeLabel: Record<AuditEventType, string> = {
  payroll_upload: "Payroll",
  anomaly: "Anomaly",
  intervention: "Intervention",
  investigation: "Investigation",
  verification: "Verification",
};

function typeClass(t: AuditEventType) {
  switch (t) {
    case "intervention":
      return "border-amber-500/40 bg-amber-500/10 text-amber-100";
    case "anomaly":
      return "border-red-500/40 bg-red-500/10 text-red-100";
    case "payroll_upload":
      return "border-zinc-600 bg-zinc-900 text-zinc-200";
    default:
      return "border-zinc-700 bg-zinc-900/80 text-zinc-200";
  }
}

export function AuditTimeline() {
  const { data } = useAuditEvents();
  const [filter, setFilter] = useState<AuditEventType | "all">("all");

  const events = useMemo(() => {
    const raw = data ?? [];
    if (filter === "all") return raw;
    return raw.filter((e) => e.type === filter);
  }, [data, filter]);

  const filters: (AuditEventType | "all")[] = [
    "all",
    "payroll_upload",
    "anomaly",
    "intervention",
    "investigation",
    "verification",
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SectionTitle
        eyebrow="Audit trail"
        title="Immutable operational timeline"
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[11px]",
              filter === f
                ? "border-zinc-200 bg-zinc-800 text-zinc-50"
                : "border-zinc-700 text-zinc-400 hover:bg-zinc-900",
            )}
          >
            {f === "all" ? "All events" : typeLabel[f]}
          </button>
        ))}
      </div>

      <ol className="relative space-y-0 border-l border-zinc-800 pl-6">
        {events.map((ev, idx) => (
          <motion.li
            key={ev.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="relative pb-10 pl-2 last:pb-0"
          >
            <span className="absolute -left-[29px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            </span>
            <div
              className={`inline-flex items-center gap-2 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${typeClass(ev.type)}`}
            >
              {typeLabel[ev.type]}
            </div>
            <div className="mt-2 font-mono text-[11px] text-zinc-500">
              {formatShortDate(ev.at)}
              {ev.actor ? ` · ${ev.actor}` : ""}
            </div>
            <h3 className="mt-1 text-sm font-medium text-zinc-100">{ev.title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{ev.detail}</p>
            {ev.refId ? (
              <p className="mt-2 font-mono text-[10px] text-zinc-600">REF {ev.refId}</p>
            ) : null}
          </motion.li>
        ))}
      </ol>
      {!events.length ? (
        <p className="text-center text-sm text-zinc-500">
          No events for this filter.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionTitle } from "@/components/SectionTitle";
import { usePayrollCycle } from "@/hooks/use-domain-queries";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { FlaggedQueueRow, PayrollProcessingStatus } from "@/types/domain";

const paymentLabel: Record<string, string> = {
  scheduled: "Scheduled",
  paused: "Paused",
  approved: "Approved",
  disbursed: "Disbursed",
};

const invLabel: Record<string, string> = {
  none: "None",
  open: "Open",
  in_review: "In review",
  escalated: "Escalated",
  closed: "Closed",
};

function statusLabel(s: PayrollProcessingStatus) {
  if (s === "uploaded") return "Staged";
  if (s === "analyzing") return "Analyzing";
  if (s === "ready") return "Ready for review";
  return "Locked";
}

function TrustDecay({ row }: { row: FlaggedQueueRow }) {
  const prev = row.trustPrevious;
  if (prev == null) return <span className="text-zinc-500">—</span>;
  const delta = row.trustScore - prev;
  const bad = delta < 0;
  return (
    <span
      className={
        bad ? "font-mono text-amber-200/90" : "font-mono text-zinc-400"
      }
    >
      {prev} → {row.trustScore}
      {bad ? " decay" : ""}
    </span>
  );
}

export function PayrollReview({ cycleId }: { cycleId: string }) {
  const { data: cycle } = usePayrollCycle(cycleId);

  if (!cycle) {
    return (
      <div className="font-mono text-sm text-zinc-500">Loading cycle or not found…</div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <SectionTitle
        eyebrow="Workflow"
        title="Payroll intelligence review"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/payroll"
            className="font-mono text-xs text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
          >
            ← All cycles
          </Link>
          <span className="font-mono text-xs text-zinc-500">
            {statusLabel(cycle.processingStatus)} · {cycle.id}
          </span>
        </div>
      </SectionTitle>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <div className="font-mono text-[10px] uppercase text-zinc-500">Ingested</div>
          <div className="mt-1 font-mono text-sm text-zinc-200">
            {formatShortDate(cycle.uploadedAt)}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <div className="font-mono text-[10px] uppercase text-zinc-500">Employees</div>
          <div className="mt-1 font-mono text-xl tabular-nums text-zinc-50">
            {cycle.totalEmployees.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <div className="font-mono text-[10px] uppercase text-zinc-500">Disbursement</div>
          <div className="mt-1 font-mono text-xl tabular-nums text-zinc-50">
            {formatCurrency(cycle.totalDisbursement)}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <div className="font-mono text-[10px] uppercase text-zinc-500">Flagged / paused</div>
          <div className="mt-1 text-sm text-zinc-200">
            <span className="font-mono tabular-nums">{cycle.flaggedCount}</span> flagged ·{" "}
            <span className="font-mono tabular-nums text-amber-200/90">
              {cycle.pausedPayments}
            </span>{" "}
            paused
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-200">Flagged employee queue</h2>
          <span className="font-mono text-[10px] text-zinc-500">
            Trust · attendance · payment intervention
          </span>
        </div>
        <div className="divide-y divide-zinc-800/80">
          {(cycle.flaggedRows ?? []).map((row) => (
            <div
              key={row.employeeId}
              className="grid gap-4 px-4 py-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-zinc-100">{row.employeeName}</span>
                  <RiskBadge level={row.severity} />
                  <span className="font-mono text-[11px] text-zinc-500">{row.employeeId}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.anomalyLabels.map((a) => (
                    <span
                      key={a}
                      className="rounded border border-zinc-700/80 bg-zinc-950/80 px-2 py-0.5 font-mono text-[10px] text-zinc-400"
    >
                      {a}
                    </span>
                  ))}
                </div>
                {row.attendanceNotes && row.attendanceNotes.length > 0 ? (
                  <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                    <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
                      Attendance signals
                    </div>
                    <ul className="mt-1 list-inside list-disc text-xs text-zinc-400">
                      {row.attendanceNotes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {row.relationshipWarning ? (
                  <p className="mt-2 text-xs text-amber-200/80">{row.relationshipWarning}</p>
                ) : null}
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-zinc-500">Trust trace · </span>
                  <TrustDecay row={row} />
                </div>
                <div>
                  <span className="text-zinc-500">Payment · </span>
                  <span className="font-mono text-zinc-200">
                    {paymentLabel[row.paymentStatus] ?? row.paymentStatus}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Investigation · </span>
                  <span className="font-mono text-zinc-200">
                    {invLabel[row.investigationStatus] ?? row.investigationStatus}
                  </span>
                </div>
              </div>
              <div className="text-sm text-zinc-400 lg:text-right">
                {row.investigationId ? (
                  <Link
                    href={`/investigations/${row.investigationId}`}
                    className="inline-flex rounded-md border border-zinc-600 px-3 py-1.5 font-mono text-xs text-zinc-100 hover:bg-zinc-800"
                  >
                    Open workspace
                  </Link>
                ) : (
                  <span className="text-zinc-600">No investigation opened</span>
                )}
              </div>
            </div>
          ))}
          {!cycle.flaggedRows?.length ? (
            <div className="px-4 py-12 text-center text-sm text-zinc-500">
              No flagged rows · disbursement path clear for this cycle.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

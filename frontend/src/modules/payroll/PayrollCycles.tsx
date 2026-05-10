"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionTitle } from "@/components/SectionTitle";
import {
  usePayrollCycles,
  useStartCycleAnalysis,
  useUploadPayrollBatch,
} from "@/hooks/use-domain-queries";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import type { PayrollProcessingStatus, RiskSeverity } from "@/types/domain";

function statusCopy(s: PayrollProcessingStatus): {
  label: string;
  detail: string;
  tone: "neutral" | "amber" | "emerald" | "zinc";
} {
  switch (s) {
    case "uploaded":
      return {
        label: "Staged",
        detail: "Awaiting integrity analysis",
        tone: "zinc",
      };
    case "analyzing":
      return {
        label: "Analyzing",
        detail: "Models evaluating disbursement risk",
        tone: "amber",
      };
    case "ready":
      return {
        label: "Ready for review",
        detail: "Analyst queue open",
        tone: "emerald",
      };
    case "locked":
      return {
        label: "Locked",
        detail: "Cycle closed / disbursed",
        tone: "neutral",
      };
  }
}

function StatusPill({ s }: { s: PayrollProcessingStatus }) {
  const c = statusCopy(s);
  return (
    <span
      className={cn(
        "inline-flex flex-col rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wide",
        c.tone === "amber" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-100",
        c.tone === "emerald" &&
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
        c.tone === "zinc" && "border-zinc-600 bg-zinc-900 text-zinc-300",
        c.tone === "neutral" && "border-zinc-700 bg-zinc-800/60 text-zinc-300",
      )}
    >
      <span>{c.label}</span>
    </span>
  );
}

function severityFromFlagged(n: number): RiskSeverity {
  if (n >= 3) return "high";
  if (n >= 1) return "medium";
  return "low";
}

export function PayrollCycles() {
  const { data: cycles, isFetching } = usePayrollCycles();
  const upload = useUploadPayrollBatch();
  const analyze = useStartCycleAnalysis();
  const fileRef = useRef<HTMLInputElement>(null);
  const [empCount, setEmpCount] = useState("1850");
  const [msg, setMsg] = useState<string | null>(null);

  const onPickFile = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMsg(null);
    upload.mutate(
      { fileName: f.name, employeeCount: Number(empCount) || 850 },
      {
        onSuccess: () => setMsg(`Staged ${f.name}. Run analysis to open the review queue.`),
        onError: () => setMsg("Upload failed (mock)."),
      },
    );
    e.target.value = "";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <SectionTitle
        eyebrow="Payroll operations"
        title="Cycles · uploads & processing"
      />

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Upload payroll CSV</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Staging ingests a batch identifier only (sandbox). Map to your ingest
          pipeline when wiring production.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Expected rows
            <input
              type="number"
              min={1}
              value={empCount}
              onChange={(e) => setEmpCount(e.target.value)}
              className="w-28 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm text-zinc-100"
            />
          </label>
          <button
            type="button"
            onClick={onPickFile}
            disabled={upload.isPending}
            className="rounded-md border border-zinc-600 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
          >
            {upload.isPending ? "Uploading…" : "Choose CSV file"}
          </button>
        </div>
        {msg ? (
          <p className="mt-3 font-mono text-xs text-amber-200/90">{msg}</p>
        ) : null}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Uploaded batches</h2>
          {isFetching ? (
            <span className="font-mono text-[10px] text-zinc-500">Refreshing…</span>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-800/80">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950/80 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ingested</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Disbursement</th>
                <th className="px-4 py-3">Flagged</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {(cycles ?? []).map((c) => {
                const st = statusCopy(c.processingStatus);
                const risk = severityFromFlagged(c.flaggedCount);
                return (
                  <tr key={c.id} className="bg-zinc-900/20">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-100">{c.label}</div>
                      <div className="font-mono text-[11px] text-zinc-500">{c.id}</div>
                      {c.sourceFile ? (
                        <div className="font-mono text-[10px] text-zinc-600">
                          {c.sourceFile}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill s={c.processingStatus} />
                      <div className="mt-1 text-[11px] text-zinc-500">{st.detail}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      {formatShortDate(c.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-200">
                      {c.totalEmployees.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-200">
                      {formatCurrency(c.totalDisbursement)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-200">{c.flaggedCount}</span>
                        <RiskBadge level={risk} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {c.processingStatus === "uploaded" ? (
                          <button
                            type="button"
                            disabled={analyze.isPending}
                            onClick={() =>
                              analyze.mutate(c.id, {
                                onSuccess: (r) => {
                                  if (!r.ok) setMsg(r.message);
                                  else setMsg(`Analysis finished for ${c.label}`);
                                },
                              })
                            }
                            className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 font-mono text-xs text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
                          >
                            Run integrity analysis
                          </button>
                        ) : null}
                        {c.processingStatus === "ready" ||
                        c.processingStatus === "locked" ? (
                          <Link
                            href={`/payroll/review/${c.id}`}
                            className="inline-block rounded-md border border-zinc-600 px-3 py-1.5 font-mono text-xs text-zinc-100 hover:bg-zinc-800"
                          >
                            Open intelligence review
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!cycles?.length ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">No cycles</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

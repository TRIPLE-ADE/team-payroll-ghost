"use client";

import { motion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClientOnlyChart } from "@/components/ClientOnlyChart";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionTitle } from "@/components/SectionTitle";
import {
  useInvestigation,
  useInvestigationActionMutation,
  useRelationshipContext,
} from "@/hooks/use-domain-queries";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import type { InvestigationActionType } from "@/types/domain";
import Link from "next/link";
import { useState } from "react";

function InvestigationRelationshipPanel({ employeeId }: { employeeId: string }) {
  const { data } = useRelationshipContext(employeeId);
  if (!data?.nodes.length) return null;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Relationship context
        </h3>
        <Link
          href={`/relationships?focus=${encodeURIComponent(employeeId)}`}
          className="font-mono text-[10px] text-amber-200/90 hover:text-amber-100"
        >
          Full graph →
        </Link>
      </div>
      <ul className="mt-2 space-y-2">
        {data.nodes.map((n) => (
          <li
            key={n.id}
            className="flex items-center justify-between gap-2 border-b border-zinc-800/60 py-1.5 text-[11px] last:border-0"
          >
            <span className="text-zinc-200">{n.label}</span>
            {n.risk ? <RiskBadge level={n.risk} /> : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-zinc-600">
        Edges: shared routing tokens, approval chains, geo-window clusters (mock).
      </p>
    </div>
  );
}

const actions: { type: InvestigationActionType; label: string; tone?: "danger" }[] =
  [
    { type: "pause_payment", label: "Pause payment", tone: "danger" },
    { type: "approve_payment", label: "Approve payment" },
    { type: "escalate", label: "Escalate investigation" },
    { type: "request_verification", label: "Request verification" },
  ];

export function InvestigationWorkspace({ id }: { id: string }) {
  const { data, isLoading } = useInvestigation(id);
  const mutation = useInvestigationActionMutation();
  const [banner, setBanner] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <div className="font-mono text-sm text-zinc-500">Loading workspace…</div>
    );
  }

  const { investigation: inv, employee: emp } = data;
  const trustScores = inv.trustSeries.map((t) => t.score);
  const trustPath = trustScores.join(" → ");

  const attendanceTimeline = inv.timeline.filter(
    (t) =>
      /attendance|timesheet|shift|time-card/i.test(t.summary) ||
      t.type.toLowerCase().includes("attendance"),
  );
  const attendanceFactors = inv.explainableFactors.filter((f) =>
    /attendance|time|shift/i.test(f.title),
  );

  const onAction = (type: InvestigationActionType) => {
    setBanner(null);
    mutation.mutate(
      { investigationId: inv.id, type },
      {
        onSuccess: (res) => {
          setBanner(res.message);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <SectionTitle
        eyebrow="Investigation workspace"
        title={`${inv.id} · ${emp.name}`}
      >
        <span className="font-mono text-xs text-zinc-500">
          Status: {inv.status.replace(/_/g, " ")}
        </span>
      </SectionTitle>

      {banner ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 font-mono text-xs text-zinc-300"
        >
          {banner}
        </motion.div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr_minmax(260px,320px)]">
        {/* Left: profile */}
        <section className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Employee intelligence profile
          </h2>
          <div>
            <div className="text-lg font-semibold text-zinc-50">{emp.name}</div>
            <div className="text-sm text-zinc-400">
              {emp.role} · {emp.department}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Trust score</span>
              <span className="font-mono text-2xl tabular-nums text-zinc-50">
                {emp.trustScore}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">
              Peer avg {emp.peerGroupAvgTrust} · path {trustPath}
            </p>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Verification</div>
            <p
              className={cn(
                "mt-1 text-sm",
                emp.verificationStatus === "expired"
                  ? "text-red-200/90"
                  : emp.verificationStatus === "expiring"
                    ? "text-amber-200/90"
                    : "text-zinc-200",
              )}
            >
              {emp.verificationStatus === "expired"
                ? "Expired"
                : emp.verificationStatus === "expiring"
                  ? "Expiring"
                  : "Current"}{" "}
              · {formatShortDate(emp.verificationExpiresAt)}
            </p>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Payroll history (samples)</div>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-zinc-400">
              {emp.payrollHistoryMonths.map((m) => (
                <li key={m.month} className="flex justify-between gap-2">
                  <span>{m.month}</span>
                  <span className="text-zinc-200">{formatCurrency(m.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <InvestigationRelationshipPanel employeeId={emp.id} />
        </section>

        {/* Center: timeline + trust + explainable */}
        <section className="space-y-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Trust evolution
            </h2>
            <div className="h-48 min-h-[192px] w-full min-w-0">
              <ClientOnlyChart>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  initialDimension={{ width: 390, height: 192 }}
                >
                  <LineChart
                    data={inv.trustSeries.map((t) => ({
                      ...t,
                      t: formatShortDate(t.at),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="t" stroke="#71717a" tick={{ fontSize: 10 }} />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#71717a"
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #3f3f46",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#e4e4e7"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ClientOnlyChart>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Anomaly timeline & evidence
            </h2>
            <ol className="relative space-y-4 border-l border-zinc-800 pl-4">
              {inv.timeline.map((ev, idx) => (
                <motion.li
                  key={ev.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="relative"
                >
                  <span className="absolute left-[-21px] top-1.5 h-2.5 w-2.5 rounded-full border border-zinc-600 bg-zinc-900" />
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge level={ev.severity} />
                    <span className="font-mono text-[10px] text-zinc-500">
                      {formatShortDate(ev.detectedAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-200">{ev.summary}</p>
                  {ev.trustAtPoint != null ? (
                    <p className="font-mono text-[11px] text-zinc-500">
                      Trust at signal: {ev.trustAtPoint}
                    </p>
                  ) : null}
                </motion.li>
              ))}
            </ol>
          </div>

          {attendanceTimeline.length > 0 || attendanceFactors.length > 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Attendance & time signals
              </h2>
              {attendanceTimeline.length > 0 ? (
                <ul className="space-y-2">
                  {attendanceTimeline.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-md border border-zinc-800/80 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-300"
                    >
                      <span className="font-mono text-[10px] text-zinc-500">
                        {formatShortDate(t.detectedAt)}
                      </span>
                      <p className="mt-1">{t.summary}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {attendanceFactors.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {attendanceFactors.map((f) => (
                    <li
                      key={f.id}
                      className="text-xs text-zinc-400"
                    >
                      <span className="font-medium text-zinc-200">{f.title}</span> —{" "}
                      {f.detail}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Explainable intelligence
            </h2>
            <ul className="space-y-4">
              {inv.explainableFactors.map((f) => (
                <li
                  key={f.id}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">
                      {f.title}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      Confidence {f.confidence}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{f.detail}</p>
                  <ul className="mt-2 list-inside list-disc font-mono text-[11px] text-zinc-400">
                    {f.evidence.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                  {f.historicalNote ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Historical: {f.historicalNote}
                    </p>
                  ) : null}
                  {f.peerNote ? (
                    <p className="mt-1 text-xs text-zinc-500">Peer: {f.peerNote}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right: actions */}
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Investigation actions
          </h2>
          <p className="mt-2 text-xs text-zinc-500">
            Human-in-the-loop controls. All actions are audited.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {actions.map((a) => (
              <button
                key={a.type}
                type="button"
                disabled={mutation.isPending}
                onClick={() => onAction(a.type)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  a.tone === "danger"
                    ? "border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/15"
                    : "border-zinc-700 bg-zinc-950/60 text-zinc-100 hover:bg-zinc-800",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-4 font-mono text-[10px] leading-relaxed text-zinc-600">
            AI assists triage; disbursement authority remains with authorized
            operators. Actions propagate to payroll hold state and audit trail.
          </p>
        </section>
      </div>
    </div>
  );
}

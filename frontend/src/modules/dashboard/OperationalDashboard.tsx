"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClientOnlyChart } from "@/components/ClientOnlyChart";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionTitle } from "@/components/SectionTitle";
import {
  useCurrentPayrollCycleBrief,
  useDepartmentRisk,
  useIntegrityOverview,
  useIntegrityTrends,
  useInvestigations,
  useLiquiditySnapshot,
  useOperationalQueueStats,
  useRecentSquadLedger,
  useThreatFeed,
  useTreasuryWallet,
} from "@/hooks/use-domain-queries";
import {
  CurrentCycleSection,
  LiquiditySection,
  PolicyModeLine,
  QueueStatsSection,
  SquadLedgerSection,
  TreasuryFundingSection,
} from "@/modules/dashboard/DashboardOperationalExtensions";
import { cn, formatShortDate } from "@/lib/utils";
import type { DepartmentRisk, RiskSeverity } from "@/types/domain";

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-50">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function heatCellClass(level: RiskSeverity) {
  if (level === "high") return "bg-red-500/25 border-red-500/40";
  if (level === "medium") return "bg-amber-500/20 border-amber-500/35";
  return "bg-zinc-800/80 border-zinc-700/80";
}

function DepartmentHeatmap({ rows }: { rows: DepartmentRisk[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((d) => (
        <div
          key={d.department}
          className={cn(
            "flex items-center justify-between rounded-md border px-3 py-2",
            heatCellClass(d.riskLevel),
          )}
        >
          <div>
            <div className="text-sm font-medium text-zinc-100">{d.department}</div>
            <div className="font-mono text-[11px] text-zinc-500">
              Δ trust {d.trustDelta} · {d.anomalyCount} anomalies
            </div>
          </div>
          <RiskBadge level={d.riskLevel} />
        </div>
      ))}
    </div>
  );
}

export function OperationalDashboard() {
  const overview = useIntegrityOverview();
  const feed = useThreatFeed();
  const dept = useDepartmentRisk();
  const trends = useIntegrityTrends();
  const investigations = useInvestigations();
  const treasury = useTreasuryWallet();
  const liquidity = useLiquiditySnapshot();
  const currentCycle = useCurrentPayrollCycleBrief();
  const queueStats = useOperationalQueueStats();
  const squadLedger = useRecentSquadLedger(8);

  const ov = overview.data;
  const chartData = trends.data ?? [];
  const recentInv = [...(investigations.data ?? [])]
    .sort(
      (a, b) =>
        new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
    )
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <SectionTitle
        eyebrow="Command center"
        title="Risk operations · payroll integrity overview"
      />

      <PolicyModeLine />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <TreasuryFundingSection q={treasury} />
        </div>
        <div className="lg:col-span-5">
          <LiquiditySection q={liquidity} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CurrentCycleSection q={currentCycle} />
        <QueueStatsSection q={queueStats} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Integrity score"
          value={ov ? `${ov.payrollIntegrityScore}` : "—"}
          sub="Institution-wide blended signal"
        />
        <Kpi
          label="Flagged disbursements"
          value={ov ? `${ov.flaggedDisbursements}` : "—"}
          sub="Queued for analyst review"
        />
        <Kpi
          label="Active investigations"
          value={ov ? `${ov.activeInvestigations}` : "—"}
          sub="Open / in review / escalated"
        />
        <Kpi
          label="Paused payments"
          value={ov ? `${ov.pausedPayments}` : "—"}
          sub="Held before disbursement"
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 xl:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Threat feed</h2>
            <span className="font-mono text-[10px] text-zinc-500">Live queue</span>
          </div>
          <ul className="space-y-2">
            {(feed.data ?? []).map((item, i) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="flex gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/60 px-3 py-2"
              >
                <RiskBadge level={item.severity} className="h-fit shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200">{item.title}</p>
                  <p className="font-mono text-[11px] text-zinc-500">
                    {formatShortDate(item.timestamp)}
                    {item.department ? ` · ${item.department}` : ""}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">
              Recent investigations
            </h2>
            <Link
              href="/investigations"
              className="font-mono text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              View all →
            </Link>
          </div>
          <ul className="space-y-2">
            {recentInv.map((inv, i) => {
              const high = inv.timeline.some((t) => t.severity === "high");
              return (
                <motion.li
                  key={inv.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-zinc-200">
                        {inv.id}
                      </span>
                      <RiskBadge level={high ? "high" : "medium"} />
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                      {inv.employeeId} · {formatShortDate(inv.openedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/investigations/${inv.id}`}
                    className="shrink-0 rounded border border-zinc-600 px-2 py-1 font-mono text-[10px] text-zinc-200 hover:bg-zinc-800"
                  >
                    Workspace
                  </Link>
                </motion.li>
              );
            })}
          </ul>
          {!recentInv.length ? (
            <p className="text-sm text-zinc-500">No open investigations.</p>
          ) : null}
        </div>

        <SquadLedgerSection q={squadLedger} />
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">
            Department risk concentration
          </h2>
          <span className="font-mono text-[10px] text-zinc-500">Heat index</span>
        </div>
        <DepartmentHeatmap rows={dept.data ?? []} />
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">
            Integrity & anomaly trend
          </h2>
          <span className="font-mono text-[10px] text-zinc-500">
            Rolling operational window
          </span>
        </div>
        <div className="h-64 min-h-[256px] w-full min-w-0">
          <ClientOnlyChart>
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              initialDimension={{ width: 390, height: 256 }}
            >
              <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="period"
                  stroke="#71717a"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#71717a"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  domain={[60, 80]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#71717a"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#e4e4e7" }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="integrityScore"
                  name="Integrity score"
                  stroke="#a1a1aa"
                  fill="rgba(161,161,170,0.15)"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="anomalyCount"
                  name="Anomalies"
                  stroke="#f59e0b"
                  fill="rgba(245,158,11,0.12)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        </div>
      </div>
    </div>
  );
}

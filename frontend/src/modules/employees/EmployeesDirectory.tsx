"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionTitle } from "@/components/SectionTitle";
import { useEmployeesDirectory } from "@/hooks/use-domain-queries";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import type { RiskSeverity } from "@/types/domain";

function verLabel(s: string) {
  if (s === "expired") return "Expired";
  if (s === "expiring") return "Expiring";
  return "Current";
}

export function EmployeesDirectory() {
  const { data } = useEmployeesDirectory();
  const [dept, setDept] = useState<string | "all">("all");
  const [risk, setRisk] = useState<RiskSeverity | "all">("all");

  const departments = useMemo(() => {
    const d = new Set((data ?? []).map((e) => e.department));
    return Array.from(d).sort();
  }, [data]);

  const rows = useMemo(() => {
    let r = data ?? [];
    if (dept !== "all") r = r.filter((e) => e.department === dept);
    if (risk !== "all") r = r.filter((e) => e.riskLevel === risk);
    return r.sort((a, b) => a.trustScore - b.trustScore);
  }, [data, dept, risk]);

  const deptAvgTrust = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const e of data ?? []) {
      const x = m.get(e.department) ?? { sum: 0, n: 0 };
      x.sum += e.trustScore;
      x.n += 1;
      m.set(e.department, x);
    }
    return Array.from(m.entries()).map(([name, v]) => ({
      name,
      avg: Math.round(v.sum / v.n),
    }));
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <SectionTitle
        eyebrow="Workforce intelligence"
        title="Employee trust profiles"
      />

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Department trust baselines
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {deptAvgTrust.map((d) => (
            <div
              key={d.name}
              className="rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2 font-mono text-[11px]"
            >
              <span className="text-zinc-300">{d.name}</span>
              <span className="ml-2 text-zinc-500">avg {d.avg}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Department
          <select
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
            value={dept}
            onChange={(e) => setDept(e.target.value as typeof dept)}
          >
            <option value="all">All</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Risk band
          <select
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
            value={risk}
            onChange={(e) => setRisk(e.target.value as typeof risk)}
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800/80">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-950/80 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Trust</th>
              <th className="px-4 py-3">Peer avg</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3">Last net</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {rows.map((e) => (
              <tr key={e.id} className="bg-zinc-900/15">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-100">{e.name}</div>
                  <div className="font-mono text-[11px] text-zinc-500">{e.id}</div>
                  <div className="text-[11px] text-zinc-500">{e.role}</div>
                </td>
                <td className="px-4 py-3 text-zinc-300">{e.department}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-zinc-100">
                  {e.trustScore}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-zinc-500">
                  {e.peerGroupAvgTrust}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-xs",
                      e.verificationStatus === "expired" && "text-red-300",
                      e.verificationStatus === "expiring" && "text-amber-200",
                      e.verificationStatus === "current" && "text-zinc-400",
                    )}
                  >
                    {verLabel(e.verificationStatus)} ·{" "}
                    {formatShortDate(e.verificationExpiresAt)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-zinc-400">
                  {e.lastNetPay != null ? formatCurrency(e.lastNetPay) : "—"}
                </td>
                <td className="px-4 py-3">
                  <RiskBadge level={e.riskLevel} />
                  <Link
                    href={`/relationships?focus=${encodeURIComponent(e.id)}`}
                    className="mt-2 block font-mono text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    Relationships →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            No employees match filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}

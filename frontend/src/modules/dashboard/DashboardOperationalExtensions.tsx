"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";

import type { UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  AnomalySensitivity,
  LiquiditySnapshot,
  OperationalQueueStats,
  PayrollCycleBrief,
  PayrollProcessingStatus,
  SquadLedgerEntry,
  SquadLedgerDirection,
  TreasuryWallet,
} from "@/types/domain";

import { useSystemSettings } from "@/hooks/use-domain-queries";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-4",
        className,
      )}
    >
      <div className="h-4 w-1/3 rounded bg-zinc-800/60" />
      <div className="mt-4 h-10 w-2/3 rounded bg-zinc-800/60" />
      <div className="mt-3 h-3 w-full rounded bg-zinc-800/40" />
    </div>
  );
}

function QueryFault({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-500/35 bg-amber-500/5 p-4 text-sm text-amber-200/90">
      <p>{label}</p>
      <button
        type="button"
        className="mt-2 font-mono text-[11px] text-amber-300 underline decoration-amber-500/60 hover:text-amber-100"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}

function CopyVaButton({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch {
      setOk(false);
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={onCopy}
      className="shrink-0 rounded border border-zinc-600 px-2 py-1 font-mono text-[10px] text-zinc-200 hover:bg-zinc-800"
    >
      {ok ? "Copied" : "Copy"}
    </button>
  );
}

function processingLabel(status: PayrollProcessingStatus) {
  switch (status) {
    case "uploaded":
      return "Staged upload";
    case "analyzing":
      return "Analyzing";
    case "ready":
      return "Ready for review";
    case "locked":
      return "Locked";
    default:
      return status;
  }
}

function ledgerDirectionTone(d: SquadLedgerDirection): string {
  switch (d) {
    case "credit":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-200";
    case "debit":
      return "border-sky-500/35 bg-sky-500/10 text-sky-200";
    case "release":
      return "border-teal-500/35 bg-teal-500/10 text-teal-200";
    default:
      return "border-amber-500/35 bg-amber-500/10 text-amber-200";
  }
}

const MIN_TOPUP_NAIRA = 100;

function parseNairaAmount(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function TreasuryCheckoutModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const titleId = useId();
  const [amountRaw, setAmountRaw] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const parsed = parseNairaAmount(amountRaw);
  const valid =
    parsed != null && parsed >= MIN_TOPUP_NAIRA && parsed <= 99_000_000_000;

  function onContinue() {
    if (!valid || parsed == null) return;
    onOpenChange(false);
    toast.info("Squad checkout is not wired yet.", {
      description: `Requested top-up: ${formatCurrency(parsed)}. This will open Squad checkout once the treasury API is connected.`,
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[1px]"
        aria-label="Close funding dialog"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-sm font-semibold text-zinc-100">
          Fund payroll float
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Enter the amount you want to add via Squad checkout. You will be
          redirected to complete payment once the backend is connected.
        </p>
        <label className="mt-4 block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Amount (NGN)
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 500000"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none ring-zinc-500 placeholder:text-zinc-600 focus:ring-2"
          />
        </label>
        {parsed != null && parsed > 0 && parsed < MIN_TOPUP_NAIRA ? (
          <p className="mt-2 font-mono text-[11px] text-amber-200/90">
            Minimum top-up is {formatCurrency(MIN_TOPUP_NAIRA)}.
          </p>
        ) : null}
        {parsed != null && valid ? (
          <p className="mt-2 font-mono text-[11px] text-zinc-500">
            You are funding{" "}
            <span className="text-zinc-300">{formatCurrency(parsed)}</span>
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-zinc-600 px-3 py-2 font-mono text-xs text-zinc-300 hover:bg-zinc-900"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={onContinue}
            className="rounded-md border border-emerald-600/60 bg-emerald-600/15 px-3 py-2 font-mono text-xs text-emerald-100 hover:bg-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to checkout
          </button>
        </div>
      </div>
    </div>
  );
}

export function TreasuryFundingSection({
  q,
}: {
  q: UseQueryResult<TreasuryWallet, Error>;
}) {
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [fundModalKey, setFundModalKey] = useState(0);
  const w = q.data;
  if (q.isPending) return <CardSkeleton className="min-h-[220px]" />;
  if (q.isError || !w) {
    return (
      <QueryFault
        label="Could not load Squad treasury wallet."
        onRetry={() => void q.refetch()}
      />
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
      <TreasuryCheckoutModal
        key={fundModalKey}
        open={fundModalOpen}
        onOpenChange={setFundModalOpen}
      />
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/60 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Payroll float</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Fund via Squad virtual account · {w.bankName}
          </p>
        </div>
          <button
            type="button"
            onClick={() => {
              setFundModalKey((k) => k + 1);
              setFundModalOpen(true);
            }}
            className="rounded-md border border-emerald-600/50 bg-emerald-600/10 px-3 py-1.5 font-mono text-[11px] text-emerald-100 hover:bg-emerald-600/20"
          >
            Fund with checkout
          </button>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Available balance
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-zinc-50">
            {formatCurrency(w.balanceAmount)}
          </p>
          <p className="mt-2 font-mono text-[11px] text-zinc-500">
            Available {formatCurrency(w.availableAmount)} · Pending settlement{" "}
            {formatCurrency(w.pendingSettlementAmount)}
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Virtual account number
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg tracking-wide text-zinc-100">
              {w.virtualAccountNumber}
            </span>
            <CopyVaButton value={w.virtualAccountNumber} />
          </div>
          <p className="text-xs text-zinc-400">{w.accountName}</p>
          {w.squadMerchantRef ? (
            <p className="font-mono text-[10px] text-zinc-600">
              Merchant ref {w.squadMerchantRef}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-4 font-mono text-[10px] text-zinc-600">
        Last synced {formatShortDate(w.lastSyncedAt)}
      </p>
    </div>
  );
}

export function LiquiditySection({
  q,
}: {
  q: UseQueryResult<LiquiditySnapshot, Error>;
}) {
  const d = q.data;
  if (q.isPending) {
    return <CardSkeleton className="h-[120px]" />;
  }
  if (q.isError || !d) {
    return (
      <QueryFault
        label="Could not load liquidity snapshot."
        onRetry={() => void q.refetch()}
      />
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Liquidity vs holds</h2>
      <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
        Naira impact of integrity controls
      </p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            On integrity hold
          </dt>
          <dd className="mt-1 font-mono text-lg tabular-nums text-amber-200">
            {formatCurrency(d.pausedPaymentsTotalAmount)}
          </dd>
          <dd className="font-mono text-[10px] text-zinc-500">
            {d.heldCount} payment{d.heldCount === 1 ? "" : "s"}
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Current run total
          </dt>
          <dd className="mt-1 font-mono text-lg tabular-nums text-zinc-100">
            {d.scheduledPayrollTotalAmount > 0
              ? formatCurrency(d.scheduledPayrollTotalAmount)
              : "—"}
          </dd>
          <dd className="font-mono text-[10px] text-zinc-500">
            Active payroll batch gross
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function CurrentCycleSection({
  q,
}: {
  q: UseQueryResult<PayrollCycleBrief | null, Error>;
}) {
  const c = q.data;
  if (q.isPending) return <CardSkeleton className="h-[140px]" />;
  if (q.isError) {
    return (
      <QueryFault
        label="Could not load current payroll cycle."
        onRetry={() => void q.refetch()}
      />
    );
  }
  if (!c) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700/80 bg-zinc-950/30 p-4 text-sm text-zinc-500">
        No active payroll cycle in &ldquo;ready&rdquo; or &ldquo;analyzing&rdquo; state. Upload
        a batch on the Payroll page to continue.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-200">Current payroll run</h2>
        <span className="rounded border border-zinc-600 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
          {processingLabel(c.processingStatus)}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-300">{c.label}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-zinc-500 sm:grid-cols-4">
        <div>
          <dt className="text-zinc-600">Disbursement</dt>
          <dd className="mt-0.5 text-zinc-200">{formatCurrency(c.totalDisbursement)}</dd>
        </div>
        <div>
          <dt className="text-zinc-600">Integrity</dt>
          <dd className="mt-0.5 text-zinc-200">{c.integrityScore}</dd>
        </div>
        <div>
          <dt className="text-zinc-600">Flagged</dt>
          <dd className="mt-0.5 text-zinc-200">{c.flaggedCount}</dd>
        </div>
        <div>
          <dt className="text-zinc-600">Paused</dt>
          <dd className="mt-0.5 text-zinc-200">{c.pausedPayments}</dd>
        </div>
      </dl>
      <Link
        href="/payroll"
        className="mt-3 inline-block font-mono text-[10px] text-zinc-500 hover:text-zinc-300"
      >
        Payroll workspace →
      </Link>
    </div>
  );
}

export function QueueStatsSection({
  q,
}: {
  q: UseQueryResult<OperationalQueueStats, Error>;
}) {
  const s = q.data;
  if (q.isPending) return <CardSkeleton className="h-[100px]" />;
  if (q.isError || !s) {
    return (
      <QueryFault
        label="Could not load queue statistics."
        onRetry={() => void q.refetch()}
      />
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Review queue</h2>
      <p className="mt-3 font-mono text-[11px] text-zinc-400">
        <span className="tabular-nums text-zinc-200">{s.openFlagsCount}</span> open flags ·{" "}
        <span className="tabular-nums text-zinc-200">{s.openInvestigationsCount}</span>{" "}
        investigations
      </p>
      <p className="mt-1 font-mono text-[11px] text-zinc-400">
        Oldest unresolved case ≈{" "}
        <span className="tabular-nums text-zinc-200">
          {s.openInvestigationsCount > 0 ? `${s.oldestOpenInvestigationAgeHours}h` : "—"}
        </span>{" "}
        · Hold value{" "}
        <span className="tabular-nums text-amber-200/90">
          {formatCurrency(s.pausedAmountOnHold)}
        </span>
      </p>
    </div>
  );
}

function sensitivityLabel(s: AnomalySensitivity) {
  if (s === "high") return "High sensitivity";
  if (s === "low") return "Low sensitivity";
  return "Standard sensitivity";
}

export function PolicyModeLine() {
  const { data } = useSystemSettings();
  const institutionName = data?.institutionName?.trim() || "—";
  const anomalySensitivity = data?.anomalySensitivity ?? "standard";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-4 py-2 font-mono text-[11px] text-zinc-500">
      <span className="text-zinc-400">{institutionName}</span>
      <span>
        Policy:{" "}
        <span className="text-zinc-300">{sensitivityLabel(anomalySensitivity)}</span>
        {" · "}
        <Link href="/settings" className="text-zinc-500 hover:text-zinc-300">
          Settings →
        </Link>
      </span>
    </div>
  );
}

export function SquadLedgerSection({
  q,
}: {
  q: UseQueryResult<SquadLedgerEntry[], Error>;
}) {
  const rows = q.data ?? [];
  if (q.isPending) return <CardSkeleton className="min-h-[280px]" />;
  if (q.isError) {
    return (
      <QueryFault
        label="Could not load recent Squad ledger activity."
        onRetry={() => void q.refetch()}
      />
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Squad payout activity</h2>
        <span className="font-mono text-[10px] text-zinc-500">Recent events</span>
      </div>
      {!rows.length ? (
        <p className="text-sm text-zinc-500">No ledger events yet.</p>
      ) : (
        <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {rows.map((e) => (
            <li
              key={e.id}
              className={cn(
                "rounded-lg border px-3 py-2 font-mono text-[11px]",
                ledgerDirectionTone(e.direction),
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-medium">{e.title}</span>
                {e.amount != null ? (
                  <span className="tabular-nums">{formatCurrency(e.amount)}</span>
                ) : null}
              </div>
              {e.detail ? <p className="mt-1 text-[10px] opacity-90">{e.detail}</p> : null}
              <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] opacity-80">
                <span>{formatShortDate(e.at)}</span>
                {e.squadRef ? <span>{e.squadRef}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

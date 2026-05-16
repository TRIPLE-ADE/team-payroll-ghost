"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const CREAM = "#f0e4cb";
const CREAM_SOFT = "#e8d8b8";

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-[#111111] text-[#e9e9e9] [color-scheme:dark]">
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <Features />
        <RiskTiers />
        <SquadSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#111111]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2">
          <BrandMark />
          <span className="text-sm font-semibold tracking-tight text-[#e9e9e9]">
            PayGuard
          </span>
          <span
            className="ml-1 hidden font-mono text-[10px] uppercase tracking-widest sm:inline"
            style={{ color: CREAM_SOFT }}
          >
            · workforce integrity
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 text-sm text-[#e9e9e9]/70 md:flex"
        >
          <a href="#how-it-works" className="transition-colors hover:text-[#e9e9e9]">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-[#e9e9e9]">
            Features
          </a>
          <a href="#risk" className="transition-colors hover:text-[#e9e9e9]">
            Risk model
          </a>
          <a href="#squad" className="transition-colors hover:text-[#e9e9e9]">
            Squad
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-1.5 text-sm text-[#e9e9e9]/80 transition-colors hover:bg-white/[0.04] hover:text-[#e9e9e9] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-[#111111] transition-opacity hover:opacity-90"
            style={{ backgroundColor: CREAM }}
          >
            Open dashboard
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: CREAM, boxShadow: `0 0 12px ${CREAM}` }}
            />
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: CREAM_SOFT }}
            >
              Live · Squad Hackathon 3.0
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-[#e9e9e9] sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Stop paying{" "}
            <span style={{ color: CREAM }} className="italic">
              ghost workers
            </span>{" "}
            before the wire leaves.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[#e9e9e9]/65 sm:text-lg"
          >
            PayGuard scores every employee on every payroll cycle. Investigators
            approve the flags, Squad disburses the rest — so fraud never reaches
            production payments.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium text-[#111111] transition-opacity hover:opacity-90"
              style={{ backgroundColor: CREAM }}
            >
              Open dashboard
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-[#e9e9e9] transition-colors hover:bg-white/[0.06]"
            >
              See how it works
            </a>
          </motion.div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.35 }}
      className="relative mx-auto mt-16 max-w-5xl"
    >
      {/* Outer panel */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-2 shadow-2xl shadow-black/60">
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#111111]">
          {/* Browser-style chrome */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div className="ml-3 hidden font-mono text-[10px] uppercase tracking-widest text-[#e9e9e9]/40 sm:block">
              payguard / payroll / 2026-05 / pre-payment review
            </div>
          </div>

          {/* Body */}
          <div className="grid gap-5 p-5 md:grid-cols-[1.4fr_1fr]">
            {/* Risk queue */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: CREAM_SOFT }}
                  >
                    Flagged for review
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold text-[#e9e9e9]">
                    Cycle 2026-05 · 3 of 412 employees
                  </h3>
                </div>
                <span className="rounded-md border border-white/[0.10] bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#e9e9e9]/60">
                  Auto-refreshed
                </span>
              </div>

              <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015]">
                <EmployeeRow
                  initials="AO"
                  name="Adaeze Obi"
                  dept="Operations · Lagos"
                  score={92}
                  tier="critical"
                  reason="Salary +480% vs peers, account shared w/ HR"
                />
                <EmployeeRow
                  initials="MK"
                  name="Musa Kano"
                  dept="Field · Kano"
                  score={71}
                  tier="high"
                  reason="No biometric check-in for 28 days"
                />
                <EmployeeRow
                  initials="JE"
                  name="Joy Eze"
                  dept="Finance · Abuja"
                  score={64}
                  tier="medium"
                  reason="BVN mismatch on Squad lookup"
                />
              </ul>
            </div>

            {/* Side panel */}
            <div className="space-y-3">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
                <p
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: CREAM_SOFT }}
                >
                  Cycle status
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums text-[#e9e9e9]">
                    ₦18.4M
                  </span>
                  <span className="text-[11px] text-[#e9e9e9]/50">
                    held pending review
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Cleared" value="409" />
                  <Stat label="Held" value="3" tone="cream" />
                  <Stat label="Blocked" value="0" />
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
                <p
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: CREAM_SOFT }}
                >
                  Composite score
                </p>
                <div className="mt-3 space-y-2">
                  <ScoreBar label="Heuristics" pct={35} />
                  <ScoreBar label="Anomaly" pct={25} />
                  <ScoreBar label="ML model" pct={40} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmployeeRow({
  initials,
  name,
  dept,
  score,
  tier,
  reason,
}: {
  initials: string;
  name: string;
  dept: string;
  score: number;
  tier: "critical" | "high" | "medium";
  reason: string;
}) {
  const tierStyles = {
    critical: { color: "#fecaca", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", label: "Critical" },
    high: { color: "#fed7aa", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.32)", label: "High" },
    medium: { color: "#fde68a", bg: "rgba(234,179,8,0.10)", border: "rgba(234,179,8,0.30)", label: "Medium" },
  }[tier];

  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[11px] font-medium"
        style={{ backgroundColor: "rgba(240,228,203,0.10)", color: CREAM }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[#e9e9e9]">{name}</p>
          <span
            className="shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
            style={{ color: tierStyles.color, backgroundColor: tierStyles.bg, borderColor: tierStyles.border }}
          >
            {tierStyles.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[#e9e9e9]/50">{reason}</p>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-semibold tabular-nums text-[#e9e9e9]">
          {score}
        </div>
        <div className="text-[9px] uppercase tracking-wider text-[#e9e9e9]/40">
          {dept.split(" · ")[0]}
        </div>
      </div>
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "cream" }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] px-2 py-2">
      <div
        className="font-mono text-sm font-semibold tabular-nums"
        style={{ color: tone === "cream" ? CREAM : "#e9e9e9" }}
      >
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-[#e9e9e9]/45">
        {label}
      </div>
    </div>
  );
}

function ScoreBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-[#e9e9e9]/60">{label}</span>
        <span className="font-mono tabular-nums text-[#e9e9e9]/80">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: CREAM_SOFT }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trust strip                                                         */
/* ------------------------------------------------------------------ */

function TrustStrip() {
  const items = [
    { value: "412", label: "Employees scored / cycle" },
    { value: "3", label: "Detection models stacked" },
    { value: "<200ms", label: "Squad BVN check" },
    { value: "100%", label: "Human-in-the-loop disbursement" },
  ];
  return (
    <section className="border-y border-white/[0.06] bg-[#111111]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden bg-white/[0.06] sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="bg-[#111111] px-4 py-6 text-center sm:px-6">
            <div
              className="font-mono text-2xl font-semibold tabular-nums text-[#e9e9e9] sm:text-3xl"
            >
              {it.value}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-[#e9e9e9]/50">
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Detect",
      body: "Each employee record runs through Isolation Forest, XGBoost, and heuristic rules. The composite score routes to a tier in milliseconds.",
      icon: <SparkIcon className="h-5 w-5" />,
    },
    {
      n: "02",
      title: "Investigate",
      body: "Flagged identities land in a queue with the evidence trail — Squad BVN response, peer-salary delta, attendance gaps, related-party graph.",
      icon: <SearchIcon className="h-5 w-5" />,
    },
    {
      n: "03",
      title: "Disburse",
      body: "Investigator approves. PayGuard fires the Squad payout, writes the audit entry, and the wire leaves. Blocked records never get a chance.",
      icon: <SendIcon className="h-5 w-5" />,
    },
  ];

  return (
    <section id="how-it-works" className="relative scroll-mt-20 py-24 sm:py-32">
      <SectionHead
        eyebrow="How it works"
        title="From raw payroll to cleared payout, in three steps."
        sub="The pipeline is designed so AI never moves money on its own. A human signs off every disbursement."
      />

      <div className="mx-auto mt-14 grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="relative rounded-xl border border-white/[0.08] bg-white/[0.015] p-6"
          >
            <div className="flex items-center justify-between">
              <span
                className="font-mono text-[11px] tracking-widest"
                style={{ color: CREAM_SOFT }}
              >
                {s.n}
              </span>
              <span
                className="grid h-9 w-9 place-items-center rounded-md"
                style={{ backgroundColor: "rgba(240,228,203,0.08)", color: CREAM }}
              >
                {s.icon}
              </span>
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#e9e9e9]">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#e9e9e9]/65">
              {s.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

function Features() {
  const items = [
    {
      icon: <SparkIcon className="h-5 w-5" />,
      title: "Stacked risk scoring",
      body: "Isolation Forest + XGBoost + handcrafted rules collapse into a single 0–100 score per employee per cycle.",
    },
    {
      icon: <ShieldIcon className="h-5 w-5" />,
      title: "BVN validation",
      body: "Every payout request hits Squad's BVN endpoint first. Identity mismatch blocks the wire — no exceptions.",
    },
    {
      icon: <UsersIcon className="h-5 w-5" />,
      title: "Investigation queue",
      body: "Reviewers see the evidence trail beside the score. Approve, escalate, or block — every action is logged.",
    },
    {
      icon: <ClockIcon className="h-5 w-5" />,
      title: "Audit timeline",
      body: "Immutable record of every model decision and every human override. Export-ready for compliance review.",
    },
    {
      icon: <WaveIcon className="h-5 w-5" />,
      title: "Treasury operations",
      body: "Liquidity snapshot, queue depth, and Squad ledger reconciliation in a single operational view.",
    },
    {
      icon: <GraphIcon className="h-5 w-5" />,
      title: "Relationship graph",
      body: "Surfaces shared bank accounts, repeat referrers, and circular HR chains that single-record checks miss.",
    },
  ];

  return (
    <section id="features" className="relative scroll-mt-20 py-24 sm:py-32">
      <SectionHead
        eyebrow="Capabilities"
        title="Everything pre-payment review needs, in one operational view."
        sub="Built around the pre-disbursement workflow finance teams already run — no extra tabs, no extra spreadsheets."
      />

      <div className="mx-auto mt-14 grid max-w-7xl gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.06] px-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div
            key={it.title}
            className="group relative bg-[#111111] p-6 transition-colors hover:bg-white/[0.03]"
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-md transition-colors"
              style={{ backgroundColor: "rgba(240,228,203,0.08)", color: CREAM }}
            >
              {it.icon}
            </span>
            <h3 className="mt-5 text-base font-semibold tracking-tight text-[#e9e9e9]">
              {it.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#e9e9e9]/60">
              {it.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Risk tiers                                                          */
/* ------------------------------------------------------------------ */

function RiskTiers() {
  const tiers = [
    { label: "Low", range: "< 30", desc: "Clear for auto-disbursement", color: "#4ade80", pct: 30 },
    { label: "Medium", range: "30 – 60", desc: "Reviewer attention recommended", color: "#facc15", pct: 30 },
    { label: "High", range: "60 – 80", desc: "Held pending investigation", color: "#fb923c", pct: 20 },
    { label: "Critical", range: "≥ 80", desc: "Blocked, escalated to fraud lead", color: "#f87171", pct: 20 },
  ];

  return (
    <section id="risk" className="relative scroll-mt-20 py-24 sm:py-32">
      <SectionHead
        eyebrow="Risk model"
        title="Four tiers. One disbursement policy."
        sub="The composite score is opinionated on purpose: every record lands in exactly one tier and the workflow is defined ahead of time."
      />

      <div className="mx-auto mt-14 max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Threshold bar */}
        <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.015]">
          <div className="flex h-3 w-full">
            {tiers.map((t) => (
              <div
                key={t.label}
                style={{ width: `${t.pct}%`, backgroundColor: t.color, opacity: 0.7 }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-px bg-white/[0.06] sm:grid-cols-4">
            {tiers.map((t) => (
              <div key={t.label} className="bg-[#111111] p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-sm font-semibold text-[#e9e9e9]">
                    {t.label}
                  </span>
                </div>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[#e9e9e9]/55">
                  {t.range}
                </div>
                <p className="mt-2 text-[12px] leading-snug text-[#e9e9e9]/60">
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#e9e9e9]/45">
          Score = heuristics × 0.35 + anomaly × 0.25 + ML × 0.40
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Squad integration                                                   */
/* ------------------------------------------------------------------ */

function SquadSection() {
  return (
    <section id="squad" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-8 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p
                className="font-mono text-[11px] uppercase tracking-widest"
                style={{ color: CREAM_SOFT }}
              >
                Built on Squad
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#e9e9e9] sm:text-4xl">
                Identity and payout, on the same rail.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[#e9e9e9]/65">
                PayGuard is a thin layer on top of Squad&apos;s BVN lookup and
                payout transfer APIs. We add the risk model and the human review
                — Squad handles the regulated identity and money movement.
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  "BVN identity match before any payout leaves",
                  "Squad payout transfer fires only after sign-off",
                  "Ledger reconciliation surfaced in the dashboard",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: CREAM }} />
                    <span className="text-[#e9e9e9]/75">{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Endpoint cards */}
            <div className="grid gap-3 self-center">
              <EndpointCard
                method="POST"
                path="/virtual-account"
                purpose="BVN validation — 400 means identity mismatch, block the payment."
              />
              <EndpointCard
                method="POST"
                path="/payout/transfer"
                purpose="Disburse to validated account once human review clears the record."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EndpointCard({
  method,
  path,
  purpose,
}: {
  method: string;
  path: string;
  purpose: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#111111] p-4">
      <div className="flex items-center gap-2">
        <span
          className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
          style={{
            color: CREAM,
            backgroundColor: "rgba(240,228,203,0.08)",
            borderColor: "rgba(240,228,203,0.25)",
          }}
        >
          {method}
        </span>
        <code className="font-mono text-sm text-[#e9e9e9]">{path}</code>
      </div>
      <p className="mt-2.5 text-[12px] leading-snug text-[#e9e9e9]/55">{purpose}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                           */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-[#e9e9e9] sm:text-5xl">
          Ready to see the next cycle{" "}
          <span style={{ color: CREAM }} className="italic">
            before
          </span>{" "}
          it disburses?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[#e9e9e9]/65">
          The sandbox dashboard ships with a seeded payroll cycle, three flagged
          identities, and a wired Squad sandbox. No commitment, no setup.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium text-[#111111] transition-opacity hover:opacity-90"
            style={{ backgroundColor: CREAM }}
          >
            Open dashboard
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com/TRIPLE-ADE/team-payroll-ghost"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-[#e9e9e9] transition-colors hover:bg-white/[0.06]"
          >
            <GithubIcon className="h-4 w-4" />
            View source
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#111111]">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-xs text-[#e9e9e9]/45 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <BrandMark size={14} />
          <span className="text-[#e9e9e9]/65">PayGuard</span>
          <span className="text-[#e9e9e9]/35">·</span>
          <span>Workforce integrity for Squad Hackathon 3.0</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#how-it-works" className="hover:text-[#e9e9e9]/80">
            How it works
          </a>
          <a href="#features" className="hover:text-[#e9e9e9]/80">
            Features
          </a>
          <Link href="/login" className="hover:text-[#e9e9e9]/80">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
      <p
        className="font-mono text-[11px] uppercase tracking-widest"
        style={{ color: CREAM_SOFT }}
      >
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[#e9e9e9] sm:text-4xl">
        {title}
      </h2>
      {sub ? (
        <p className="mt-4 text-pretty text-[15px] leading-relaxed text-[#e9e9e9]/65">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 2.5 4 5.5v6.2c0 4.8 3.4 8.7 8 9.8 4.6-1.1 8-5 8-9.8V5.5l-8-3Z"
        stroke={CREAM}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m8.8 12 2.4 2.4L15.4 10"
        stroke={CREAM}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M5 12H2" />
      <path d="M22 12h-3" />
      <path d="M7 7 5 5" />
      <path d="m17 17 2 2" />
      <path d="M7 17l-2 2" />
      <path d="m17 7 2-2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
      <path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
    </svg>
  );
}

function GraphIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M6.5 7.2 10.7 16.5" />
      <path d="M17.5 7.2 13.3 16.5" />
      <path d="M7 6h10" />
    </svg>
  );
}

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.36 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.12 2.91.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05A9.34 9.34 0 0 1 12 7.07c.85 0 1.7.12 2.5.34 1.9-1.32 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.71 1.03 1.62 1.03 2.74 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

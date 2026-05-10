import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionTitle } from "@/components/SectionTitle";
import { mockApi } from "@/services/api";

export default async function InvestigationsIndexPage() {
  const list = await mockApi.listInvestigations();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SectionTitle
        eyebrow="Investigations"
        title="Active integrity reviews"
      />
      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
        {list.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-zinc-200">{inv.id}</span>
                <RiskBadge
                  level={
                    inv.timeline.some((t) => t.severity === "high")
                      ? "high"
                      : "medium"
                  }
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Employee {inv.employeeId} · {inv.status.replace(/_/g, " ")}
              </p>
            </div>
            <Link
              href={`/investigations/${inv.id}`}
              className="rounded-md border border-zinc-600 px-3 py-1.5 font-mono text-xs text-zinc-100 hover:bg-zinc-800"
            >
              Workspace
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

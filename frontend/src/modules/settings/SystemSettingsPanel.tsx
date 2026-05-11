"use client";

import { SectionTitle } from "@/components/SectionTitle";
import { useSettingsStore } from "@/stores/settings-store";
import type { AnomalySensitivity } from "@/types/domain";

export function SystemSettingsPanel() {
  const s = useSettingsStore();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <SectionTitle
        eyebrow="Governance"
        title="System configuration"
      />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <fieldset className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Institution
          </legend>
          <label className="mt-3 block text-xs text-zinc-500">
            Display name
            <input
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={s.institutionName}
              onChange={(e) => s.setPartial({ institutionName: e.target.value })}
            />
          </label>
        </fieldset>

        <fieldset className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Risk engine
          </legend>
          <label className="mt-3 block text-xs text-zinc-500">
            Trust floor (analyst alert below this score)
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-32 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
              value={s.riskTrustFloor}
              onChange={(e) =>
                s.setPartial({ riskTrustFloor: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="mt-4 block text-xs text-zinc-500">
            Anomaly sensitivity
            <select
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={s.anomalySensitivity}
              onChange={(e) =>
                s.setPartial({ anomalySensitivity: e.target.value as AnomalySensitivity })
              }
            >
              <option value="low">Low — fewer false positives</option>
              <option value="standard">Standard</option>
              <option value="high">High — broader surfacing</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Notifications
          </legend>
          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={s.notifyReviewersEmail}
              onChange={(e) =>
                s.setPartial({ notifyReviewersEmail: e.target.checked })
              }
            />
            Email reviewers on new high-severity flags
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={s.notifyEscalationsSlack}
              onChange={(e) =>
                s.setPartial({ notifyEscalationsSlack: e.target.checked })
              }
            />
            Slack channel for escalations (stub)
          </label>
        </fieldset>

        <p className="font-mono text-[10px] leading-relaxed text-zinc-600">
          Stored locally in this browser for demo. Connect to configuration service
          for production governance.
        </p>
      </form>
    </div>
  );
}

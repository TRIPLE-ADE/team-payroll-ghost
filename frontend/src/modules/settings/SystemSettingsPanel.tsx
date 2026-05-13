"use client";

import { useState } from "react";
import { toast } from "sonner";

import { SectionTitle } from "@/components/SectionTitle";
import {
  useSystemSettings,
  useUpdateSystemSettings,
} from "@/hooks/use-domain-queries";
import { getApiErrorMessage } from "@/lib/axios-error";
import type { AnomalySensitivity, SystemSettings } from "@/types/domain";

function settingsEqual(a: SystemSettings, b: SystemSettings): boolean {
  return (
    a.institutionName === b.institutionName &&
    a.riskTrustFloor === b.riskTrustFloor &&
    a.anomalySensitivity === b.anomalySensitivity &&
    a.notifyReviewersEmail === b.notifyReviewersEmail &&
    a.notifyEscalationsSlack === b.notifyEscalationsSlack
  );
}

export function SystemSettingsPanel() {
  const { data, dataUpdatedAt, isLoading, isError, error, refetch } =
    useSystemSettings();
  const update = useUpdateSystemSettings();
  const [draft, setDraft] = useState<SystemSettings | null>(null);
  const [syncedAt, setSyncedAt] = useState<number>(-1);

  if (data && dataUpdatedAt !== syncedAt) {
    setSyncedAt(dataUpdatedAt);
    setDraft(structuredClone(data));
  }

  const dirty =
    draft != null && data != null && !settingsEqual(draft, data);
  const pending = update.isPending;

  function setPartial(p: Partial<SystemSettings>) {
    setDraft((d) => (d ? { ...d, ...p } : null));
  }

  function onSave() {
    if (!draft) return;
    update.mutate(draft, {
      onSuccess: () => {
        toast.success("Settings saved.");
      },
      onError: (e) => {
        toast.error(getApiErrorMessage(e));
      },
    });
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <SectionTitle eyebrow="Governance" title="System configuration" />
        <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Loading settings…
        </div>
      </div>
    );
  }

  if (isError || !draft) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <SectionTitle eyebrow="Governance" title="System configuration" />
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isError ? getApiErrorMessage(error) : "No settings loaded."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <SectionTitle eyebrow="Governance" title="System configuration" />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <fieldset className="rounded-xl border border-border bg-card p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Institution
          </legend>
          <label className="mt-3 block text-xs text-muted-foreground">
            Display name
            <input
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
              value={draft.institutionName}
              onChange={(e) => setPartial({ institutionName: e.target.value })}
            />
          </label>
        </fieldset>

        <fieldset className="rounded-xl border border-border bg-card p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Risk engine
          </legend>
          <label className="mt-3 block text-xs text-muted-foreground">
            Trust floor (analyst alert below this score)
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-32 rounded-md border border-border bg-input px-3 py-2 font-mono text-sm text-foreground"
              value={draft.riskTrustFloor}
              onChange={(e) =>
                setPartial({ riskTrustFloor: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="mt-4 block text-xs text-muted-foreground">
            Anomaly sensitivity
            <select
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
              value={draft.anomalySensitivity}
              onChange={(e) =>
                setPartial({
                  anomalySensitivity: e.target.value as AnomalySensitivity,
                })
              }
            >
              <option value="low">Low — fewer false positives</option>
              <option value="standard">Standard</option>
              <option value="high">High — broader surfacing</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="rounded-xl border border-border bg-card p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notifications
          </legend>
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.notifyReviewersEmail}
              onChange={(e) =>
                setPartial({ notifyReviewersEmail: e.target.checked })
              }
            />
            Email reviewers on new high-severity flags
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.notifyEscalationsSlack}
              onChange={(e) =>
                setPartial({ notifyEscalationsSlack: e.target.checked })
              }
            />
            Slack channel for escalations
          </label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!dirty || pending}
            className="rounded-md border border-border-strong bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          {dirty ? (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          ) : null}
        </div>
      </form>
    </div>
  );
}

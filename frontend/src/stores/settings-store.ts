import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SystemSettings } from "@/types/domain";

type SettingsState = SystemSettings & {
  setPartial: (p: Partial<SystemSettings>) => void;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  institutionName: "Northfield Consortium",
  riskTrustFloor: 55,
  anomalySensitivity: "standard",
  notifyReviewersEmail: true,
  notifyEscalationsSlack: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SYSTEM_SETTINGS,
      setPartial: (p) => set((s) => ({ ...s, ...p })),
    }),
    {
      name: "payroll-ghost-settings",
      partialize: (s) => ({
        institutionName: s.institutionName,
        riskTrustFloor: s.riskTrustFloor,
        anomalySensitivity: s.anomalySensitivity,
        notifyReviewersEmail: s.notifyReviewersEmail,
        notifyEscalationsSlack: s.notifyEscalationsSlack,
      }),
    },
  ),
);

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mockApi } from "@/services/api";
import {
  fetchDepartmentRisk,
  fetchIntegrityOverview,
  fetchIntegrityTrends,
  fetchThreatFeed,
} from "@/services/integrity-api";
import { fetchInvestigations } from "@/services/investigations-api";
import {
  fetchLiquiditySnapshot,
  fetchOperationalQueueStats,
} from "@/services/operations-api";
import { fetchCurrentPayrollCycle } from "@/services/payroll-api";
import { fetchRecentSquadLedger } from "@/services/squad-api";
import { fetchTreasuryWallet } from "@/services/treasury-api";
import type { InvestigationActionType } from "@/types/domain";

export const qk = {
  overview: ["integrity", "overview"] as const,
  threat: ["threat-feed"] as const,
  dept: ["departments", "risk"] as const,
  trends: ["trends", "integrity"] as const,
  cycles: ["payroll", "cycles"] as const,
  cycle: (id: string) => ["payroll", "cycle", id] as const,
  cycleCurrent: ["payroll", "cycles", "current"] as const,
  treasury: ["treasury", "wallet"] as const,
  liquidity: ["operations", "liquidity"] as const,
  squadLedger: ["squad", "ledger"] as const,
  queueStats: ["operations", "queue-stats"] as const,
  investigations: ["investigations"] as const,
  investigation: (id: string) => ["investigation", id] as const,
  relationships: ["relationships"] as const,
  relationshipContext: (employeeId: string) =>
    ["relationships", "ctx", employeeId] as const,
  audit: ["audit"] as const,
  employees: ["employees", "directory"] as const,
  payments: ["payments", "interventions"] as const,
};

export function useIntegrityOverview() {
  return useQuery({ queryKey: qk.overview, queryFn: fetchIntegrityOverview });
}

export function useThreatFeed() {
  return useQuery({ queryKey: qk.threat, queryFn: fetchThreatFeed });
}

export function useDepartmentRisk() {
  return useQuery({ queryKey: qk.dept, queryFn: fetchDepartmentRisk });
}

export function useIntegrityTrends() {
  return useQuery({ queryKey: qk.trends, queryFn: fetchIntegrityTrends });
}

export function useTreasuryWallet() {
  return useQuery({ queryKey: qk.treasury, queryFn: fetchTreasuryWallet });
}

export function useLiquiditySnapshot() {
  return useQuery({ queryKey: qk.liquidity, queryFn: fetchLiquiditySnapshot });
}

export function useCurrentPayrollCycleBrief() {
  return useQuery({
    queryKey: qk.cycleCurrent,
    queryFn: fetchCurrentPayrollCycle,
  });
}

export function useRecentSquadLedger(limit = 8) {
  return useQuery({
    queryKey: [...qk.squadLedger, limit] as const,
    queryFn: () => fetchRecentSquadLedger(limit),
  });
}

export function useOperationalQueueStats() {
  return useQuery({
    queryKey: qk.queueStats,
    queryFn: fetchOperationalQueueStats,
  });
}

export function usePayrollCycles() {
  return useQuery({ queryKey: qk.cycles, queryFn: () => mockApi.listPayrollCycles() });
}

export function usePayrollCycle(id: string | null) {
  return useQuery({
    queryKey: id ? qk.cycle(id) : ["payroll", "cycle", "none"],
    queryFn: () => (id ? mockApi.getPayrollCycle(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useInvestigations() {
  return useQuery({
    queryKey: qk.investigations,
    queryFn: fetchInvestigations,
  });
}

export function useInvestigation(id: string | null) {
  return useQuery({
    queryKey: id ? qk.investigation(id) : ["investigation", "none"],
    queryFn: () => (id ? mockApi.getInvestigation(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useRelationships() {
  return useQuery({
    queryKey: qk.relationships,
    queryFn: () => mockApi.getRelationships(),
  });
}

export function useAuditEvents() {
  return useQuery({ queryKey: qk.audit, queryFn: () => mockApi.getAuditEvents() });
}

export function useEmployeesDirectory() {
  return useQuery({
    queryKey: qk.employees,
    queryFn: () => mockApi.getEmployeesDirectory(),
  });
}

export function usePaymentInterventions() {
  return useQuery({
    queryKey: qk.payments,
    queryFn: () => mockApi.getPaymentInterventions(),
  });
}

export function useRelationshipContext(employeeId: string | null) {
  return useQuery({
    queryKey: employeeId
      ? qk.relationshipContext(employeeId)
      : ["relationships", "ctx", "none"],
    queryFn: () =>
      employeeId ? mockApi.getRelationshipContext(employeeId) : Promise.resolve(null),
    enabled: !!employeeId,
  });
}

export function useUploadPayrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { fileName: string; employeeCount: number }) =>
      mockApi.uploadPayrollBatch(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.cycles });
      void qc.invalidateQueries({ queryKey: qk.cycleCurrent });
      void qc.invalidateQueries({ queryKey: qk.treasury });
      void qc.invalidateQueries({ queryKey: qk.liquidity });
      void qc.invalidateQueries({ queryKey: qk.queueStats });
      void qc.invalidateQueries({ queryKey: qk.squadLedger });
      void qc.invalidateQueries({ queryKey: qk.audit });
      void qc.invalidateQueries({ queryKey: qk.overview });
      void qc.invalidateQueries({ queryKey: qk.payments });
    },
  });
}

export function useStartCycleAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cycleId: string) => mockApi.startCycleAnalysis(cycleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.cycles });
      void qc.invalidateQueries({ queryKey: qk.cycleCurrent });
      void qc.invalidateQueries({ queryKey: qk.treasury });
      void qc.invalidateQueries({ queryKey: qk.liquidity });
      void qc.invalidateQueries({ queryKey: qk.queueStats });
      void qc.invalidateQueries({ queryKey: qk.squadLedger });
      void qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "payroll",
      });
      void qc.invalidateQueries({ queryKey: qk.audit });
      void qc.invalidateQueries({ queryKey: qk.overview });
      void qc.invalidateQueries({ queryKey: qk.payments });
      void qc.invalidateQueries({ queryKey: qk.employees });
    },
  });
}

export function useInvestigationActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      investigationId,
      type,
    }: {
      investigationId: string;
      type: InvestigationActionType;
    }) => mockApi.submitInvestigationAction(investigationId, type),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.overview });
      void qc.invalidateQueries({ queryKey: qk.cycles });
      void qc.invalidateQueries({ queryKey: qk.cycleCurrent });
      void qc.invalidateQueries({ queryKey: qk.treasury });
      void qc.invalidateQueries({ queryKey: qk.liquidity });
      void qc.invalidateQueries({ queryKey: qk.queueStats });
      void qc.invalidateQueries({ queryKey: qk.squadLedger });
      void qc.invalidateQueries({ queryKey: qk.investigations });
      void qc.invalidateQueries({ queryKey: qk.audit });
      void qc.invalidateQueries({ queryKey: qk.payments });
      void qc.invalidateQueries({ queryKey: qk.employees });
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "investigation" });
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll" });
    },
  });
}

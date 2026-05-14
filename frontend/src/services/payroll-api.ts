import { isAxiosError } from "axios";

import { http } from "@/lib/http";
import type {
  PayrollCycleBrief,
  PayrollCycleDetail,
  PayrollCycleSummary,
} from "@/types/domain";

export async function fetchCurrentPayrollCycle(): Promise<PayrollCycleBrief | null> {
  const { data } = await http.get<PayrollCycleBrief | null>(
    "/api/v1/payroll/cycles/current",
  );
  return data ?? null;
}

export async function fetchPayrollCycles(): Promise<PayrollCycleSummary[]> {
  const { data } = await http.get<PayrollCycleSummary[]>("/api/v1/payroll/cycles");
  return data;
}

export async function fetchPayrollCycleDetail(
  id: string,
): Promise<PayrollCycleDetail | null> {
  try {
    const { data } = await http.get<PayrollCycleDetail>(
      `/api/v1/payroll/cycles/${encodeURIComponent(id)}`,
    );
    return data ?? null;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

export async function uploadPayrollBatch(file: File): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await http.post<{ id: string }>(
    "/api/v1/payroll/cycles",
    formData,
  );
  return data;
}

export async function startPayrollCycleAnalysis(
  cycleId: string,
): Promise<{ ok: boolean; message: string }> {
  const { data } = await http.post<Partial<{ ok: boolean; message: string }>>(
    `/api/v1/payroll/cycles/${encodeURIComponent(cycleId)}/analyze`,
    {},
  );
  return {
    ok: data?.ok ?? true,
    message: data?.message ?? "Analysis started.",
  };
}

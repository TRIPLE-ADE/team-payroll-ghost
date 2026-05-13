import { http } from "@/lib/http";
import type { PayrollCycleBrief } from "@/types/domain";

export async function fetchCurrentPayrollCycle(): Promise<PayrollCycleBrief | null> {
  const { data } = await http.get<PayrollCycleBrief | null>(
    "/api/v1/payroll/cycles/current",
  );
  return data ?? null;
}

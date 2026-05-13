import { isAxiosError } from "axios";

import { http } from "@/lib/http";
import type {
  EmployeeProfile,
  Investigation,
  InvestigationActionType,
} from "@/types/domain";

/** Shape expected by `InvestigationWorkspace` (GET /api/v1/investigations/:id). */
export type InvestigationWorkspacePayload = {
  investigation: Investigation;
  employee: EmployeeProfile;
};

export async function fetchInvestigations(): Promise<Investigation[]> {
  const { data } = await http.get<Investigation[]>("/api/v1/investigations");
  return data;
}

export async function fetchInvestigationWorkspace(
  id: string,
): Promise<InvestigationWorkspacePayload | null> {
  try {
    const { data } = await http.get<InvestigationWorkspacePayload>(
      `/api/v1/investigations/${encodeURIComponent(id)}`,
    );
    return data ?? null;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

export async function submitInvestigationAction(
  investigationId: string,
  type: InvestigationActionType,
): Promise<{ ok: boolean; message: string }> {
  const { data } = await http.post<Partial<{ ok: boolean; message: string }>>(
    `/api/v1/investigations/${encodeURIComponent(investigationId)}/actions`,
    { type },
  );
  return {
    ok: data?.ok ?? true,
    message: data?.message ?? "Action recorded.",
  };
}

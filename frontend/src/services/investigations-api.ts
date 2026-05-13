import { http } from "@/lib/http";
import type { Investigation } from "@/types/domain";

export async function fetchInvestigations(): Promise<Investigation[]> {
  const { data } = await http.get<Investigation[]>("/api/v1/investigations");
  return data;
}

export async function fetchInvestigation(id: string): Promise<Investigation> {
  const { data } = await http.get<Investigation>(
    `/api/v1/investigations/${encodeURIComponent(id)}`,
  );
  return data;
}

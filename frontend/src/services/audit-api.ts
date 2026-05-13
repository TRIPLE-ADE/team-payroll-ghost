import { http } from "@/lib/http";
import type { AuditEvent } from "@/types/domain";

export async function fetchAuditEvents(): Promise<AuditEvent[]> {
  const { data } = await http.get<AuditEvent[]>("/api/v1/audit/events");
  return data;
}

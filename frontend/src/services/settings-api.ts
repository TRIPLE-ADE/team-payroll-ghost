import { http } from "@/lib/http";
import type { SystemSettings } from "@/types/domain";

export async function fetchSystemSettings(): Promise<SystemSettings> {
  const { data } = await http.get<SystemSettings>("/api/v1/settings");
  return data;
}

export async function updateSystemSettings(
  body: SystemSettings,
): Promise<SystemSettings> {
  const { data } = await http.put<SystemSettings>("/api/v1/settings", body);
  return data;
}

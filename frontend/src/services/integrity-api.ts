import { http } from "@/lib/http";
import type {
  DepartmentRisk,
  IntegrityOverview,
  ThreatFeedItem,
  TrendPoint,
} from "@/types/domain";

export async function fetchIntegrityOverview(): Promise<IntegrityOverview> {
  const { data } = await http.get<IntegrityOverview>(
    "/api/v1/integrity/overview",
  );
  return data;
}

export async function fetchThreatFeed(): Promise<ThreatFeedItem[]> {
  const { data } = await http.get<ThreatFeedItem[]>("/api/v1/threat-feed");
  return data;
}

export async function fetchDepartmentRisk(): Promise<DepartmentRisk[]> {
  const { data } = await http.get<DepartmentRisk[]>(
    "/api/v1/departments/risk",
  );
  return data;
}

export async function fetchIntegrityTrends(): Promise<TrendPoint[]> {
  const { data } = await http.get<TrendPoint[]>("/api/v1/trends/integrity");
  return data;
}

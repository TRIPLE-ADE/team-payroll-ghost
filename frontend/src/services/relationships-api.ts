import { isAxiosError } from "axios";

import { http } from "@/lib/http";
import type { GraphEdge, GraphNode } from "@/types/domain";

export type RelationshipsGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

export async function fetchRelationshipsGraph(): Promise<RelationshipsGraph> {
  const { data } = await http.get<RelationshipsGraph>(
    "/api/v1/relationships/graph",
  );
  return data;
}

export async function fetchRelationshipContext(
  employeeId: string,
): Promise<RelationshipsGraph> {
  try {
    const { data } = await http.get<RelationshipsGraph>(
      `/api/v1/relationships/context/${encodeURIComponent(employeeId)}`,
    );
    return data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) {
      return { nodes: [], edges: [] };
    }
    throw e;
  }
}

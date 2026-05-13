import { http } from "@/lib/http";
import type {
  LiquiditySnapshot,
  OperationalQueueStats,
} from "@/types/domain";

export async function fetchLiquiditySnapshot(): Promise<LiquiditySnapshot> {
  const { data } = await http.get<LiquiditySnapshot>(
    "/api/v1/operations/liquidity",
  );
  return data;
}

export async function fetchOperationalQueueStats(): Promise<OperationalQueueStats> {
  const { data } = await http.get<OperationalQueueStats>(
    "/api/v1/operations/queue-stats",
  );
  return data;
}

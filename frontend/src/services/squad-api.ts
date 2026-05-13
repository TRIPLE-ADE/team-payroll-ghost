import { http } from "@/lib/http";
import type { SquadLedgerEntry } from "@/types/domain";

export async function fetchRecentSquadLedger(
  limit = 10,
): Promise<SquadLedgerEntry[]> {
  const { data } = await http.get<SquadLedgerEntry[]>(
    "/api/v1/squad/ledger/recent",
    { params: { limit } },
  );
  return data;
}

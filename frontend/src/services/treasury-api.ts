import { http } from "@/lib/http";
import type { TreasuryWallet } from "@/types/domain";

export async function fetchTreasuryWallet(): Promise<TreasuryWallet> {
  const { data } = await http.get<TreasuryWallet>("/api/v1/treasury/wallet");
  return data;
}

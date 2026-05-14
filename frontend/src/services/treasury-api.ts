import { http } from "@/lib/http";
import type {
  TreasuryTopupInitiateRequest,
  TreasuryTopupInitiateResponse,
  TreasuryWallet,
} from "@/types/domain";

export async function fetchTreasuryWallet(): Promise<TreasuryWallet> {
  const { data } = await http.get<TreasuryWallet>("/api/v1/treasury/wallet");
  return data;
}

export async function initiateTreasuryTopup(
  body: TreasuryTopupInitiateRequest,
): Promise<TreasuryTopupInitiateResponse> {
  const { data } = await http.post<TreasuryTopupInitiateResponse>(
    "/api/v1/treasury/topups/initiate",
    body,
  );
  return data;
}

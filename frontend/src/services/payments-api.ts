import { http } from "@/lib/http";
import type { PaymentInterventionRow } from "@/types/domain";

export async function fetchPaymentInterventions(): Promise<
  PaymentInterventionRow[]
> {
  const { data } = await http.get<PaymentInterventionRow[]>(
    "/api/v1/payments/interventions",
  );
  return data;
}

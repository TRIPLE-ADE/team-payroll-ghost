import { PayrollReview } from "@/modules/payroll/PayrollReview";

export default async function PayrollReviewPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  return <PayrollReview cycleId={cycleId} />;
}

import { InvestigationWorkspace } from "@/modules/investigations/InvestigationWorkspace";

export default async function InvestigationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvestigationWorkspace id={id} />;
}

import { Suspense } from "react";
import { OperationalDashboard } from "@/modules/dashboard/OperationalDashboard";

function DashboardFallback() {
  return (
    <div className="p-6 font-mono text-sm text-muted-foreground">
      Loading dashboard…
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <OperationalDashboard />
    </Suspense>
  );
}

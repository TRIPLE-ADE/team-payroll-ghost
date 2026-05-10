import { Suspense } from "react";
import { RelationshipIntel } from "@/modules/risk-analysis/RelationshipIntel";

function RelationshipFallback() {
  return (
    <div className="p-6 font-mono text-sm text-zinc-500">Loading relationships…</div>
  );
}

export default function RelationshipsPage() {
  return (
    <Suspense fallback={<RelationshipFallback />}>
      <RelationshipIntel />
    </Suspense>
  );
}

import { cn } from "@/lib/utils";
import type { RiskSeverity } from "@/types/domain";

const styles: Record<RiskSeverity, string> = {
  low: "bg-zinc-700/50 text-zinc-300 border-zinc-600/60",
  medium: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  high: "bg-red-500/15 text-red-200 border-red-500/40",
};

export function RiskBadge({
  level,
  className,
}: {
  level: RiskSeverity;
  className?: string;
}) {
  const label = level === "low" ? "Low" : level === "medium" ? "Med" : "High";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        styles[level],
        className,
      )}
    >
      {label}
    </span>
  );
}

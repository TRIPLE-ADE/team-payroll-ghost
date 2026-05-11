"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionTitle } from "@/components/SectionTitle";
import { useRelationships } from "@/hooks/use-domain-queries";
import { cn } from "@/lib/utils";
import type { GraphEdge, GraphNode, RiskSeverity } from "@/types/domain";

const riskToHandle: Record<RiskSeverity, string> = {
  high: "#f87171",
  medium: "#fbbf24",
  low: "#a1a1aa",
};

function mapNodes(
  nodes: GraphNode[],
  selectedId: string | null,
  focusId: string | null,
): Node[] {
  const pos: Record<string, { x: number; y: number }> = {
    "emp-204": { x: 80, y: 40 },
    "emp-118": { x: 320, y: 40 },
    "acct-77": { x: 200, y: 180 },
    "cl-1": { x: 200, y: 320 },
  };
  return nodes.map((n) => {
    const sel = n.id === selectedId;
    const foc = n.id === focusId;
    return {
      id: n.id,
      position: pos[n.id] ?? { x: 0, y: 0 },
      data: { label: n.label, nodeType: n.type, risk: n.risk },
      style: {
        border: `1px solid ${n.risk ? riskToHandle[n.risk] : "#3f3f46"}`,
        background: "#09090b",
        color: "#e4e4e7",
        fontSize: 11,
        padding: 8,
        borderRadius: 8,
        minWidth: 120,
        boxShadow: foc ? "0 0 0 2px rgba(245,158,11,0.45)" : undefined,
        outline: sel && !foc ? "2px solid #e4e4e7" : undefined,
      },
    };
  });
}

function mapEdges(edges: GraphEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    style: { stroke: "#52525b" },
    labelStyle: { fill: "#a1a1aa", fontSize: 10 },
  }));
}

export function RelationshipIntel() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const { data } = useRelationships();
  const [kind, setKind] = useState<"all" | GraphNode["type"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const baseNodes = useMemo(() => data?.nodes ?? [], [data]);
  const baseEdges = useMemo(() => data?.edges ?? [], [data]);

  const filteredNodes = useMemo(() => {
    if (kind === "all") return baseNodes;
    return baseNodes.filter((n) => n.type === kind);
  }, [baseNodes, kind]);

  const filteredIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes],
  );

  const filteredEdges = useMemo(
    () =>
      baseEdges.filter(
        (e) => filteredIds.has(e.source) && filteredIds.has(e.target),
      ),
    [baseEdges, filteredIds],
  );

  const nodes = useMemo(
    () =>
      mapNodes(filteredNodes, selectedId, focusId && filteredIds.has(focusId) ? focusId : null),
    [filteredNodes, selectedId, focusId, filteredIds],
  );

  const edges = useMemo(() => mapEdges(filteredEdges), [filteredEdges]);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedId(node.id);
  }, []);

  const selected = filteredNodes.find((n) => n.id === selectedId);
  const linkedEdges = selected
    ? filteredEdges.filter(
        (e) => e.source === selected.id || e.target === selected.id,
      )
    : [];

  const taxonomy = (
    <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-[10px] text-zinc-500">
      <div className="text-[9px] uppercase tracking-wider text-zinc-600">
        Legend
      </div>
      <p>
        <span className="text-zinc-300">Employee</span> — workforce identity
      </p>
      <p>
        <span className="text-zinc-300">Account</span> — shared payout / routing
        surfaces
      </p>
      <p>
        <span className="text-zinc-300">Cluster</span> — correlated anomaly group
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <SectionTitle
        eyebrow="Relationship intelligence"
        title="Linked employees · payout clusters"
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase text-zinc-500">
          Surface filter
        </span>
        {(
          [
            ["all", "All"],
            ["employee", "Employees"],
            ["account", "Accounts"],
            ["cluster", "Clusters"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setKind(key)}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[11px]",
              kind === key
                ? "border-zinc-200 bg-zinc-800 text-zinc-50"
                : "border-zinc-700 text-zinc-400 hover:bg-zinc-900",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="h-[480px] rounded-xl border border-zinc-800/80 bg-zinc-950">
          {data ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              nodesFocusable
              onNodeClick={onNodeClick}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#27272a" gap={16} />
              <Controls />
            </ReactFlow>
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-sm text-zinc-500">
              Loading graph…
            </div>
          )}
        </div>
        <aside className="space-y-3">
          {taxonomy}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Selection
            </h2>
            {selected ? (
              <div className="mt-2 space-y-2 text-sm">
                <div className="font-medium text-zinc-100">{selected.label}</div>
                <div className="font-mono text-[11px] text-zinc-500">{selected.id}</div>
                <div className="text-xs capitalize text-zinc-400">{selected.type}</div>
                {selected.risk ? <RiskBadge level={selected.risk} /> : null}
                <div className="mt-3 border-t border-zinc-800 pt-2">
                  <div className="font-mono text-[10px] uppercase text-zinc-600">
                    Incident edges
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                    {linkedEdges.map((e) => (
                      <li key={e.id}>
                        → {e.label}{" "}
                        <span className="font-mono text-zinc-600">
                          ({e.source}–{e.target})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Select a node for shared account and cluster linkage detail.
                {focusId ? " URL focus applied to target employee." : ""}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Node index
            </h2>
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {filteredNodes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(n.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border px-2 py-2 text-left font-mono text-[11px]",
                      selectedId === n.id
                        ? "border-zinc-500 bg-zinc-800/50"
                        : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900",
                    )}
                  >
                    <span className="text-xs font-medium text-zinc-200">{n.label}</span>
                    {n.risk ? <RiskBadge level={n.risk} /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import type { BranchTree, BranchNode } from "@/types/branch";

interface Props {
  tree: BranchTree;
  onSelect: (nodeId: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  resolved: "bg-emerald-500",
  active:   "bg-[#5c2d6e] shadow-[0_0_0_2px_rgba(92,45,110,0.22)]",
  open:     "border border-[#c4b8a8] bg-transparent",
};

function LessonNodeItem({
  node,
  tree,
  depth,
  onSelect,
}: {
  node: BranchNode;
  tree: BranchTree;
  depth: number;
  onSelect: (id: string) => void;
}) {
  const isActive = node.id === tree.activeNodeId;
  const dotCls = STATUS_DOT[node.status] ?? STATUS_DOT.open;

  // Indent via left padding on a wrapper; button stays w-full so right edges align
  const indent = depth * 10;
  return (
    <div style={{ paddingLeft: indent }}>
      <button
        onClick={() => onSelect(node.id)}
        className={`w-full text-left rounded-md px-2 py-1.5 mb-0.5 flex items-start gap-1.5 border transition-all ${
          isActive
            ? "bg-[#f0e8f5] border-[#c4a8d4]"
            : node.status === "resolved"
              ? "border-transparent opacity-45 hover:opacity-65"
              : "border-transparent opacity-60 hover:opacity-80"
        }`}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${dotCls}`} />
        <div className="min-w-0">
          <div className={`text-[10px] leading-tight font-medium truncate ${
            isActive ? "text-[#2d2822]" : "text-[#4a3422]"
          }`}>
            {node.concept ?? node.label}
          </div>
          <div className={`text-[8px] mt-0.5 font-semibold uppercase tracking-wider ${
            node.origin === "highlight" ? "text-[#7c5c3b]" : "text-[#5c2d6e]"
          }`}>
            {node.origin === "highlight" ? "highlight" : `wrong step ${(node.wrongStepIndex ?? 0) + 1}`}
          </div>
          {node.status === "resolved" && (
            <div className="text-[8px] text-emerald-600 mt-0.5">✓ resolved</div>
          )}
        </div>
      </button>

      {node.childIds.length > 0 && (
        <div className="border-l border-[#e4ddd0] ml-3 mt-0.5 mb-1">
          {node.childIds.map((childId) => {
            const child = tree.nodes[childId];
            if (!child) return null;
            return (
              <LessonNodeItem
                key={childId}
                node={child}
                tree={tree}
                depth={depth + 1}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LessonsOverlay({ tree, onSelect }: Props) {
  const rootNode = tree.nodes[tree.rootId];
  const drillNodes = (rootNode?.childIds ?? [])
    .map((id) => tree.nodes[id])
    .filter((n): n is BranchNode => !!n);

  // Zero drills — same w-44 card panel as populated state
  if (drillNodes.length === 0) {
    return (
      <div
        className="absolute top-4 right-4 z-30 w-44 bg-[#fffefb] border border-[#e4ddd0] rounded-2xl overflow-hidden pointer-events-none select-none"
        style={{ boxShadow: "0 2px 12px rgba(44,30,20,0.10)" }}
        aria-label="No lessons yet"
      >
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="font-display text-xs font-bold text-[#4a3422] italic">Lessons</span>
          <span className="text-[9px] bg-[#f0e8da] text-[#7c5c3b] rounded-full px-1.5 py-0.5 font-semibold">0</span>
        </div>
      </div>
    );
  }

  const totalDrills = Object.values(tree.nodes).filter((n) => n.origin !== "root").length;

  return (
    <div className="absolute top-4 right-4 z-30 w-44 bg-[#fffefb] border border-[#e4ddd0] rounded-2xl overflow-hidden flex flex-col"
      style={{ boxShadow: "0 2px 12px rgba(44,30,20,0.10)", maxHeight: "calc(100vh - 2rem)" }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#e4ddd0] flex items-center justify-between flex-shrink-0">
        <span className="font-display text-xs font-bold text-[#4a3422] italic">Lessons</span>
        <span className="text-[9px] bg-[#f0e8da] text-[#7c5c3b] rounded-full px-1.5 py-0.5 font-semibold">
          {totalDrills}
        </span>
      </div>

      {/* Drill nodes — scrollable if many */}
      <div className="overflow-y-auto p-1.5">
        {drillNodes.map((node) => (
          <LessonNodeItem
            key={node.id}
            node={node}
            tree={tree}
            depth={0}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

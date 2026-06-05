"use client";

import React from "react";
import type { BranchTree, BranchNode } from "@/types/branch";

interface Props {
  tree: BranchTree;
  onSelect: (nodeId: string) => void;
}

const ORIGIN_TAG: Record<string, { label: string; cls: string }> = {
  "wrong-step": { label: "wrong step", cls: "bg-[#f0e8f5] text-[#5c2d6e] border border-[#c4a8d4]" },
  highlight:    { label: "highlighted", cls: "bg-[#f0e8da] text-[#7c5c3b] border border-[#c4b8a8]" },
  root:         { label: "",            cls: "" },
};

const STATUS_DOT: Record<string, string> = {
  resolved: "bg-emerald-500",
  active:   "bg-[#5c2d6e] shadow-[0_0_0_2px_rgba(92,45,110,0.22)]",
  open:     "border border-[#c4b8a8] bg-transparent",
};

export default function BranchTree({ tree, onSelect }: Props) {
  const root = tree.nodes[tree.rootId];
  if (!root) return null;

  return (
    <div className="w-28 flex-shrink-0 flex flex-col bg-[#faf7f2] border-r border-[#e4ddd0] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#e4ddd0] flex items-center justify-between">
        <span className="font-display text-xs font-bold text-[#4a3422] tracking-wide italic">Lessons</span>
        <span className="text-[9px] bg-[#f0e8da] text-[#7c5c3b] rounded-full px-1.5 py-0.5 font-semibold">
          {Object.keys(tree.nodes).length}
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-1.5">
        <NodeItem node={root} tree={tree} depth={0} onSelect={onSelect} />
      </div>
    </div>
  );
}

function NodeItem({
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
  const tag = ORIGIN_TAG[node.origin];
  const dotCls = STATUS_DOT[node.status];

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={`
          w-full text-left rounded-md px-1.5 py-1.5 mb-0.5 flex items-start gap-1.5
          border transition-all
          ${isActive
            ? "bg-[#f0e8da] border-[#c4b8a8]"
            : node.status === "resolved"
              ? "border-transparent opacity-40 hover:opacity-65"
              : "border-transparent opacity-30 hover:opacity-55"
          }
        `}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${dotCls}`} />
        <div className="min-w-0">
          <div className={`text-[10px] leading-tight font-medium truncate ${isActive ? "text-[#2d2822]" : "text-[#4a3422]"}`}>
            {node.label}
          </div>
          {tag.label && (
            <span className={`text-[7px] px-1 py-0.5 rounded mt-0.5 inline-block font-medium ${tag.cls}`}>
              {tag.label}
            </span>
          )}
          {node.status === "resolved" && !tag.label && (
            <div className="text-[8px] text-emerald-600 mt-0.5">✓ resolved</div>
          )}
          {node.status === "active" && node.origin !== "root" && (
            <div className="text-[8px] text-[#5c2d6e] mt-0.5">active</div>
          )}
        </div>
      </button>

      {/* Children */}
      {node.childIds.length > 0 && (
        <div className="pl-2.5 border-l border-[#e4ddd0] ml-2.5 mt-0.5 mb-1 flex flex-col gap-0.5">
          {node.childIds.map((childId) => {
            const child = tree.nodes[childId];
            if (!child) return null;
            return (
              <NodeItem
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

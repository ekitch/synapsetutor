"use client";

import React from "react";
import MathRenderer from "@/components/MathRenderer";
import type { BranchNode } from "@/types/branch";

interface Props {
  node: BranchNode;
  onClick: () => void;
}

export default function AncestorColumn({ node, onClick }: Props) {
  const isRoot = node.origin === "root";
  const isResolved = node.status === "resolved";
  const lastMessages = node.messages.slice(-2);

  return (
    <div
      onClick={onClick}
      className="w-16 flex-shrink-0 flex flex-col bg-[#faf7f2] border-r border-[#e4ddd0] cursor-pointer hover:bg-[#f0e8da] transition-colors group"
    >
      {/* Header */}
      <div className="px-2 py-2 border-b border-[#e4ddd0] flex-shrink-0">
        <div className="flex items-center gap-1 mb-0.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isResolved ? "bg-emerald-500" : "bg-[#5c2d6e]"}`} />
          <div className="text-[9px] font-semibold text-[#4a3422] truncate leading-tight">
            {node.label}
          </div>
        </div>
        {isResolved && (
          <div className="text-[7px] text-emerald-600 font-medium">✓ done</div>
        )}
        {!isResolved && !isRoot && (
          <div className="text-[7px] text-[#5c2d6e]">in progress</div>
        )}
      </div>

      {/* Preview messages */}
      <div className="flex-1 overflow-hidden px-2 py-1.5 flex flex-col gap-1">
        {lastMessages.map((msg) => (
          <div
            key={msg.id}
            className={`text-[8px] leading-tight rounded px-1 py-0.5 line-clamp-2 ${
              msg.role === "tutor"
                ? "text-[#4a3422] bg-[#fffefb] border border-[#e4ddd0]"
                : "text-[#faf7f2] bg-[#7c5c3b]"
            }`}
          >
            <MathRenderer text={msg.content.slice(0, 60)} className="text-[8px]" />
          </div>
        ))}
        {lastMessages.length === 0 && (
          <div className="text-[8px] text-[#a88b72] italic">No messages yet</div>
        )}
      </div>

      {/* Resume button */}
      <button
        className={`mx-1.5 mb-1.5 text-[8px] font-semibold py-1 rounded text-center transition-colors ${
          isResolved
            ? "bg-emerald-600 text-white group-hover:bg-emerald-500"
            : "bg-[#5c2d6e] text-white group-hover:bg-[#7a3d8f]"
        }`}
      >
        {isResolved ? "View ↗" : "← Back"}
      </button>
    </div>
  );
}

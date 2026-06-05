"use client";

import React, { useRef, useEffect, useState } from "react";
import MathRenderer from "@/components/MathRenderer";
import WorkInput, { WorkStep } from "@/components/WorkInput";
import DodoAvatar from "@/components/DodoAvatar";
import type { BranchNode } from "@/types/branch";

// ── Exported types ────────────────────────────────────────────

export interface DrillPrompt {
  nodeId: string;
  wrongStepIndex: number;
  wrongStepConcept: string;
  stepText: string;
  skillId: string;
}

/** Set when a drill node is answered correctly — triggers the inline move-on button. */
export interface DrillResolved {
  nodeId: string;
  concept: string;
}

// ── Main component ────────────────────────────────────────────

interface Props {
  node: BranchNode;
  problem: string;
  sessionTitle?: string | null;
  isStreaming: boolean;
  failedAttempts: number;
  drillResolved: DrillResolved | null;
  drillPrompt: DrillPrompt | null;
  onSubmitWork: (steps: WorkStep[]) => void;
  onDismissDrill: () => void;
  onHighlight: (text: string, userContext?: string) => void;
  onAcceptDrill: () => void;
  onSkipDrill: () => void;
}

type PopoverPhase = "button" | "prompt";

export default function ActiveWindow({
  node,
  problem,
  sessionTitle,
  isStreaming,
  failedAttempts,
  drillResolved,
  drillPrompt,
  onSubmitWork,
  onDismissDrill,
  onHighlight,
  onAcceptDrill,
  onSkipDrill,
}: Props) {
  const isRoot = node.origin === "root";
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const [selectionText, setSelectionText] = useState("");
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [popoverPhase, setPopoverPhase] = useState<PopoverPhase>("button");
  const [userContext, setUserContext] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [node.messages, isStreaming]);

  // Auto-focus the textarea when the prompt phase opens
  useEffect(() => {
    if (popoverPhase === "prompt") {
      setTimeout(() => promptRef.current?.focus(), 30);
    }
  }, [popoverPhase]);

  function handleMouseUp() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 3) {
      dismissPopover();
      return;
    }
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (rect && containerRect) {
      // x = centre of selection, container-relative
      // y = top of selection, container-relative — CSS transform floats the popover above
      setPopoverPos({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top,
      });
      setSelectionText(text);
      setPopoverPhase("button");
      setUserContext("");
    }
  }

  function dismissPopover() {
    setPopoverPos(null);
    setSelectionText("");
    setPopoverPhase("button");
    setUserContext("");
    window.getSelection()?.removeAllRanges();
  }

  function handleOpenPrompt(e: React.MouseEvent) {
    e.preventDefault();
    setPopoverPhase("prompt");
  }

  function handleSubmitDrill(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectionText) return;
    onHighlight(selectionText, userContext.trim() || undefined);
    dismissPopover();
  }

  const activePrompt = drillPrompt?.nodeId === node.id ? drillPrompt : null;
  const isResolved   = drillResolved?.nodeId === node.id;
  const displayTitle = isRoot ? (sessionTitle ?? "Session") : (node.concept ?? node.label);

  return (
    // `relative` is required so the absolute-positioned popover anchors here, not to a distant ancestor
    <div className="bg-[#fffefb] flex flex-col flex-1 overflow-hidden relative" ref={containerRef}>

      {/* ── Header ── */}
      <div className="bg-[#faf7f2] border-b border-[#e4ddd0] px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <DodoAvatar size="md" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-base font-bold text-[#2d2822] tracking-tight flex items-center gap-2 flex-wrap">
            <span className="truncate">{displayTitle}</span>
            {!isRoot && (
              <span className="text-[10px] font-bold text-[#5c2d6e] bg-[#f0e8f5] border border-[#c4a8d4] rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                {node.origin === "highlight" ? "Highlight drill" : `Wrong step ${(node.wrongStepIndex ?? 0) + 1}`}
              </span>
            )}
          </div>
          <div className="font-body text-xs text-[#a88b72] truncate">
            {isRoot ? problem : node.sourceText ?? ""}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      {/* pr-[200px] keeps content clear of the floating LessonsOverlay */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pr-[200px] space-y-2" onMouseUp={handleMouseUp}>
        {node.messages.map((msg, idx) => {
          const isLastMsg = idx === node.messages.length - 1;
          const showDrillButtons = activePrompt && msg.role === "tutor" && isLastMsg;
          const showMoveOnButton = isResolved && msg.role === "tutor" && isLastMsg && !isStreaming;

          return (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "items-start"}`}>
              {msg.role === "tutor" && (
                <DodoAvatar size="sm" className="mt-0.5 flex-shrink-0" />
              )}
              <div
                className={msg.role === "tutor"
                  ? "text-[#2d2822] text-base max-w-[85%]"
                  : "bg-[#7c5c3b] text-[#faf7f2] rounded-2xl rounded-br-sm px-4 py-3 text-base max-w-[80%]"
                }
                style={msg.role === "tutor" ? { lineHeight: "1.55" } : undefined}
              >
                {msg.role === "user" && msg.content.includes("Step 1:") ? (
                  <div className="space-y-1">
                    {msg.content.split("\n").map((line, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-[9px] mt-0.5 font-mono flex-shrink-0 text-[#f0e8da]">{i + 1}.</span>
                        <MathRenderer text={line.replace(/^Step \d+:\s*/, "")} className="font-mono text-sm" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <MathRenderer text={msg.content} className="leading-tight" />
                )}

                {/* Drill / Move-on buttons */}
                {showDrillButtons && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-[#e4ddd0]">
                    <button
                      onClick={onAcceptDrill}
                      className="bg-[#5c2d6e] hover:bg-[#7a3d8f] text-white text-sm font-bold font-display px-4 py-2 rounded-lg transition"
                    >
                      Drill this →
                    </button>
                    <button
                      onClick={onSkipDrill}
                      className="border border-[#e4ddd0] text-[#7c6a58] text-sm px-4 py-2 rounded-lg hover:bg-[#f0e8da] transition"
                    >
                      Move on!
                    </button>
                  </div>
                )}

                {/* Move-on button after correct drill */}
                {showMoveOnButton && (
                  <div className="mt-4 pt-3 border-t border-[#e4ddd0]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 font-display uppercase tracking-wide">
                        {drillResolved?.concept} locked in
                      </span>
                    </div>
                    <button
                      onClick={onDismissDrill}
                      className="bg-[#5c2d6e] hover:bg-[#7a3d8f] text-white text-sm font-bold font-display px-4 py-2 rounded-lg transition"
                    >
                      Back to problem →
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Highlight popover — lives OUTSIDE the scroll div so it can't be clipped ── */}
      {popoverPos && (
        <div
          className="absolute z-40 pointer-events-none"
          style={{
            left: popoverPos.x,
            top: popoverPos.y,
            transform: "translateX(-50%) translateY(calc(-100% - 10px))",
          }}
        >
          <div className="pointer-events-auto">
            {popoverPhase === "button" ? (
              /* ── Phase 1: single "Drill this →" button ── */
              <button
                className="flex items-center gap-2.5 bg-[#2d2822] hover:bg-[#3d3020] border border-[#4a3422] rounded-xl px-4 py-2.5 shadow-xl transition whitespace-nowrap"
                onMouseDown={handleOpenPrompt}
              >
                <div className="w-4 h-4 rounded-md bg-[#5c2d6e] flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <span className="text-sm font-bold text-white font-display">Drill this →</span>
              </button>
            ) : (
              /* ── Phase 2: prompt card ── */
              <form
                onSubmit={handleSubmitDrill}
                className="w-64 bg-[#fffefb] border border-[#e4ddd0] rounded-2xl shadow-2xl overflow-hidden"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Quoted selection */}
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-start gap-1.5 bg-[#f0e8f5] border border-[#c4a8d4] rounded-lg px-2.5 py-1.5 mb-3">
                    <span className="text-[#5c2d6e] font-bold text-base leading-none mt-0.5 flex-shrink-0">"</span>
                    <span className="text-[11px] text-[#5c2d6e] font-medium leading-snug line-clamp-2">
                      {selectionText.length > 60 ? selectionText.slice(0, 60) + "…" : selectionText}
                    </span>
                  </div>

                  <label className="block text-[10px] font-bold text-[#7c6a58] uppercase tracking-wider mb-1.5">
                    What do you want to understand?
                  </label>
                  <textarea
                    ref={promptRef}
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitDrill();
                      if (e.key === "Escape") dismissPopover();
                    }}
                    placeholder="e.g. why does the sign flip here?"
                    rows={2}
                    className="w-full bg-[#faf7f2] border border-[#e4ddd0] rounded-lg px-2.5 py-2 text-sm text-[#2d2822] placeholder-[#a88b72] resize-none focus:outline-none focus:border-[#5c2d6e] transition font-body"
                  />
                </div>

                {/* Actions */}
                <div className="px-3 pb-3 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#5c2d6e] hover:bg-[#7a3d8f] text-white text-sm font-bold font-display py-2 rounded-lg transition"
                  >
                    Open drill →
                  </button>
                  <button
                    type="button"
                    onClick={dismissPopover}
                    className="text-xs text-[#a88b72] hover:text-[#7c6a58] transition px-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Work input — hidden once drill is resolved ── */}
      {!isResolved && (
        <WorkInput
          onSubmit={onSubmitWork}
          isStreaming={isStreaming}
          failedAttempts={failedAttempts}
          disabled={false}
          warm={true}
        />
      )}
    </div>
  );
}

"use client";

import React from "react";

interface Problem {
  index: number;
  text: string;
}

interface Props {
  problems: Problem[];
  currentIndex: number;
  /** Problem indices where the student answered the root problem correctly */
  completedIndices: number[];
  /** Problem indices that have been visited (started but not necessarily done) */
  startedIndices: number[];
  onSelectProblem: (index: number) => void;
}

export default function AssignmentSidebar({
  problems,
  currentIndex,
  completedIndices,
  startedIndices,
  onSelectProblem,
}: Props) {
  const total = problems.length;
  const completedCount = completedIndices.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="w-44 flex-shrink-0 flex flex-col bg-[#faf7f2] border-r border-[#e4ddd0] overflow-hidden">

      {/* ── Problem tracker ── */}
      <div className="px-3 pt-3 pb-2 border-b border-[#e4ddd0]">
        <div className="text-[9px] font-bold text-[#7c6a58] uppercase tracking-wider mb-2">Problems</div>

        {/* Progress bar — based on actual correct completions */}
        <div className="h-1 bg-[#e4ddd0] rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-[#5c2d6e] rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Problem rows */}
        <div className="flex flex-col gap-1">
          {problems.map((p, i) => {
            const isCompleted = completedIndices.includes(i);
            const isStarted   = !isCompleted && startedIndices.includes(i);
            const isCurrent   = i === currentIndex;
            // upcoming = not completed, not started
            const isUpcoming  = !isCompleted && !isStarted;

            return (
              <button
                key={p.index}
                onClick={() => onSelectProblem(i)}
                className={`w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md text-left transition ${
                  isCurrent
                    ? "bg-[#fffefb] border border-[#c4a8d4]"
                    : isCompleted
                    ? "bg-[#f0e8da] border border-transparent hover:border-[#c4b8a8]"
                    : isStarted
                    ? "bg-[#f6f2ef] border border-transparent hover:border-[#c4b8a8]"
                    : "border border-transparent hover:bg-[#f0e8da]"
                }`}
              >
                {/* Circle */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? "bg-[#5c2d6e]"                                          // filled plum + checkmark
                    : isStarted
                    ? "border-2 border-[#5c2d6e]"                             // plum outline + number
                    : isCurrent
                    ? "bg-[#5c2d6e] ring-2 ring-[#c4a8d4]"                   // filled plum + ring
                    : "border border-[#c4b8a8]"                               // grey outline
                }`}>
                  {isCompleted ? (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <span className={`text-[9px] font-bold ${
                      isCurrent   ? "text-white" :
                      isStarted   ? "text-[#5c2d6e]" :
                                    "text-[#a88b72]"
                    }`}>
                      {p.index}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={`text-[10.5px] truncate leading-tight ${
                  isCurrent   ? "font-bold text-[#2d2822] font-display" :
                  isCompleted ? "text-[#7c6a58]" :
                  isStarted   ? "text-[#4a3422]" :
                                "text-[#a88b72]"
                }`}>
                  Problem {p.index}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

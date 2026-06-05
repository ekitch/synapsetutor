"use client";

import React from "react";

interface Props {
  /** sm = 20px  md = 26px */
  size?: "sm" | "md";
  /** When true the dodo strides — triggered by isStreaming */
  running?: boolean;
  className?: string;
}

/**
 * The dodo mascot. No circle or background — just the bird.
 * Plum beak (#5c2d6e), warm-tan body (#c4a882).
 * Pass running=true while the AI is streaming for the stride animation.
 */
export default function DodoAvatar({ size = "sm", running = false, className = "" }: Props) {
  const px = size === "md" ? 26 : 20;

  return (
    <div
      className={className}
      style={{ width: px, height: px, flexShrink: 0, overflow: "visible", display: "flex", alignItems: "center" }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 44 44"
        xmlns="http://www.w3.org/2000/svg"
        width={px}
        height={px}
        overflow="visible"
        className={running ? "dodo-running" : ""}
        style={{ display: "block" }}
      >
        {/* Tail feathers */}
        <path d="M10 28 C5 23 3 28 7 30" stroke="#c4a882" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M10 32 C4 28 3 34 7 34" stroke="#c4a882" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Body */}
        <ellipse cx="22" cy="28" rx="13" ry="10" fill="#c4a882" />
        {/* Wing */}
        <ellipse cx="14" cy="27" rx="5" ry="2.5" fill="#9a7c58" transform="rotate(-15 14 27)" />
        {/* Head */}
        <circle cx="30" cy="17" r="9" fill="#c4a882" />
        {/* Beak — plum accent */}
        <path d="M38 15 C43 14 44 18 41 20 C39 22 35 20 35 18 Z" fill="#5c2d6e" />
        {/* Eye */}
        <circle cx="33" cy="14" r="2.5" fill="white" />
        <circle cx="33.5" cy="14" r="1.3" fill="#2d2822" />
        <circle cx="34.1" cy="13.3" r="0.55" fill="white" />
        {/* Legs */}
        <g className="dodo-leg-l">
          <line x1="19" y1="37" x2="15" y2="43" stroke="#4a3422" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="15" y1="43" x2="11" y2="42" stroke="#4a3422" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="dodo-leg-r">
          <line x1="25" y1="37" x2="29" y2="43" stroke="#4a3422" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="29" y1="43" x2="33" y2="42" stroke="#4a3422" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

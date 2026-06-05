"use client";

import React from "react";
import DodoAvatar from "@/components/DodoAvatar";

interface Props {
  onHome: () => void;
  onGallery: () => void;
  onNew: () => void;
  onSkills: () => void;
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

/** Skills icon — a 5-pointed star with a small circle at its centre */
function SkillsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Star */}
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Centre dot — signals "mastery / skill" */}
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

export default function ToolsBar({ onHome, onGallery, onNew, onSkills }: Props) {
  return (
    <div className="w-14 flex-shrink-0 flex flex-col items-center py-4 gap-5 bg-[#faf7f2] border-r border-[#e4ddd0] z-20">
      {/* Dodo — home / back to landing */}
      <button onClick={onHome} aria-label="Go home" className="hover:opacity-75 transition-opacity">
        <DodoAvatar size="sm" />
      </button>

      <div className="w-8 h-px bg-[#e4ddd0]" />

      {/* Gallery — past sessions */}
      <button
        onClick={onGallery}
        aria-label="Past sessions"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-[#7c6a58] hover:bg-[#f0e8da] hover:text-[#4a3422] transition"
      >
        <HomeIcon />
      </button>

      {/* New session */}
      <button
        onClick={onNew}
        aria-label="New session"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-[#7c6a58] hover:bg-[#f0e8da] hover:text-[#4a3422] transition"
      >
        <PlusIcon />
      </button>

      {/* Skills */}
      <button
        onClick={onSkills}
        aria-label="Skills"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-[#7c6a58] hover:bg-[#f0e8f5] hover:text-[#5c2d6e] transition"
      >
        <SkillsIcon />
      </button>
    </div>
  );
}

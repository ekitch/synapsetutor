"use client";

import React from "react";
import type { StudentProfile, SkillStatus } from "@/types";
import { SKILL_MAP, buildDiagnosticPath } from "@/data/skillGraph";

interface Props {
  profile: StudentProfile | null;
  targetSkillId: string | null;
  masteredSkillIds: string[];
  currentRungIndex: number;
  onClose: () => void;
}

const STATUS_STYLES: Record<SkillStatus, string> = {
  unknown:    "bg-[#f0e8da] text-[#a88b72]",
  introduced: "bg-[#e8ecf5] text-[#2c3d6f]",
  struggling: "bg-[#f0e8f5] text-[#5c2d6e]",
  developing: "bg-[#f0e8da] text-[#7c5c3b]",
  mastered:   "bg-emerald-50 text-emerald-700",
};

const STATUS_LABEL: Record<SkillStatus, string> = {
  unknown:    "—",
  introduced: "Introduced",
  struggling: "Struggling",
  developing: "Developing",
  mastered:   "Mastered ✓",
};

export default function SkillMenu({
  profile,
  targetSkillId,
  masteredSkillIds,
  currentRungIndex,
  onClose,
}: Props) {
  const [tab, setTab] = React.useState<"session" | "history">("session");
  const diagnosticPath = targetSkillId ? buildDiagnosticPath(targetSkillId) : [];
  const masteredCount = masteredSkillIds.length;
  const progress = diagnosticPath.length > 0 ? masteredCount / diagnosticPath.length : 0;

  const historyRecords = profile
    ? Object.values(profile.skillRecords).filter((r) => r.status !== "unknown")
    : [];

  return (
    <div className="absolute inset-y-0 left-0 w-72 bg-[#fffefb] border-r border-[#e4ddd0] flex flex-col z-30"
      style={{ boxShadow: "2px 0 16px rgba(44,30,20,0.08)" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e4ddd0] flex items-center justify-between">
        <span className="font-display text-base font-bold text-[#2d2822] italic">Skills</span>
        <button
          onClick={onClose}
          className="text-[#a88b72] hover:text-[#2d2822] transition text-xl leading-none"
          aria-label="Close skills menu"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e4ddd0]">
        {(["session", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-bold font-display transition border-b-2 ${
              tab === t
                ? "text-[#5c2d6e] border-[#5c2d6e]"
                : "text-[#a88b72] border-transparent hover:text-[#7c6a58]"
            }`}
          >
            {t === "session" ? "This Problem" : "All History"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "session" && (
          <>
            <div className="text-[10px] font-bold text-[#7c6a58] uppercase tracking-wider mb-3">
              Progress toward {SKILL_MAP[targetSkillId ?? ""]?.name ?? "target"}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-[#e4ddd0] rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-[#5c2d6e] rounded-full transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            {/* Ladder */}
            <div className="space-y-0">
              {diagnosticPath.map((skill, i) => {
                const isDone = masteredSkillIds.includes(skill.id);
                const isCurrent = i === currentRungIndex || (currentRungIndex === -1 && i === diagnosticPath.length - 1);
                return (
                  <div
                    key={skill.id}
                    className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${
                      isCurrent ? "bg-[#f0e8f5]" : ""
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isDone
                        ? "bg-[#5c2d6e]"
                        : isCurrent
                          ? "bg-[#5c2d6e] shadow-[0_0_0_2px_rgba(92,45,110,0.22)]"
                          : "bg-[#e4ddd0]"
                    }`} />
                    <span className={`text-xs flex-1 font-body ${
                      isCurrent
                        ? "text-[#2d2822] font-semibold"
                        : isDone
                          ? "text-[#5c2d6e]"
                          : "text-[#c4b8a8]"
                    }`}>
                      {skill.name}
                    </span>
                    {isDone && <span className="text-emerald-500 text-xs">✓</span>}
                    {isCurrent && !isDone && (
                      <span className="text-[9px] text-[#5c2d6e] font-bold uppercase tracking-wider">Now</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "history" && (
          <>
            <div className="text-[10px] font-bold text-[#7c6a58] uppercase tracking-wider mb-3">
              {historyRecords.length} skill{historyRecords.length !== 1 ? "s" : ""} encountered
            </div>
            {historyRecords.length === 0 ? (
              <p className="text-xs text-[#a88b72] italic font-body">No history yet — keep working!</p>
            ) : (
              <div className="space-y-2">
                {historyRecords.map((record) => {
                  const skill = SKILL_MAP[record.skillId];
                  const pct = record.attempts > 0
                    ? Math.round((record.correctAttempts / record.attempts) * 100)
                    : 0;
                  return (
                    <div key={record.skillId} className="bg-[#faf7f2] border border-[#e4ddd0] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#2d2822] font-display">{skill?.name ?? record.skillId}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[record.status]}`}>
                          {STATUS_LABEL[record.status]}
                        </span>
                      </div>
                      <div className="h-1 bg-[#e4ddd0] rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 67 ? "bg-[#5c2d6e]" : pct >= 33 ? "bg-[#7c5c3b]" : "bg-[#c4a8d4]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-[#a88b72]">
                        {record.correctAttempts}/{record.attempts} correct · {pct}%
                        {record.lastTestedAt && (
                          <span className="ml-2">
                            · {new Date(record.lastTestedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

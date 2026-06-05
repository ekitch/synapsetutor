"use client";

import React from "react";
import { SKILL_MAP } from "@/data/skillGraph";
import DodoAvatar from "@/components/DodoAvatar";
import type { SkillStatus } from "@/types";

export interface SessionNote {
  type: "wrong" | "mastered" | "note";
  concept: string;
  detail: string;
  skillId?: string;
}

interface SkillResult {
  skillId: string;
  status: SkillStatus;
  correctAttempts: number;
  attempts: number;
}

interface Props {
  results: SkillResult[];
  sessionNotes: SessionNote[];
  onPractice: (skillId: string) => void;
  onDone: () => void;
}

export default function SessionSummary({ results, sessionNotes, onPractice, onDone }: Props) {
  const struggling = results.filter((r) => r.status === "struggling" || r.status === "developing");
  const mastered   = results.filter((r) => r.status === "mastered");

  const wrongNotes    = sessionNotes.filter((n) => n.type === "wrong");
  const masteredNotes = sessionNotes.filter((n) => n.type === "mastered");
  const remindNotes   = sessionNotes.filter((n) => n.type === "note");

  return (
    <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center p-6">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <DodoAvatar size="md" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[#2d2822] mb-2 tracking-tight">Session complete</h1>
          <p className="font-body text-[#7c6a58] text-sm">
            Here&apos;s what you worked through — and where to go next.
          </p>
        </div>

        {/* ── What tripped you up ── */}
        {wrongNotes.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-bold text-[#5c2d6e] uppercase tracking-wider mb-2">
              What tripped you up
            </div>
            <div className="flex flex-col gap-2">
              {wrongNotes.map((n, i) => (
                <div key={i} className="bg-[#fffefb] border border-[#e4ddd0] rounded-xl px-4 py-3 flex gap-3">
                  <div className="w-0.5 rounded-full bg-[#5c2d6e] flex-shrink-0 self-stretch" />
                  <div>
                    <div className="text-sm font-bold text-[#2d2822] font-display mb-0.5">{n.concept}</div>
                    <code className="text-xs text-[#7c6a58] font-mono">{n.detail}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── What you locked in ── */}
        {masteredNotes.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-bold text-[#2d6b2a] uppercase tracking-wider mb-2">
              What you locked in
            </div>
            <div className="flex flex-col gap-2">
              {masteredNotes.map((n, i) => (
                <div key={i} className="bg-[#fffefb] border border-[#e4ddd0] rounded-xl px-4 py-3 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#2d2822] font-display mb-0.5">{n.concept}</div>
                    {n.detail && <p className="text-xs text-[#7c6a58]">{n.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Things to remember ── */}
        {remindNotes.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-bold text-[#7c5c3b] uppercase tracking-wider mb-2">
              Worth remembering
            </div>
            <div className="flex flex-col gap-2">
              {remindNotes.map((n, i) => (
                <div key={i} className="bg-[#f0e8da] border border-[#c4b8a8] rounded-xl px-4 py-3">
                  <div className="text-xs font-bold text-[#4a3422] font-display mb-0.5">{n.concept}</div>
                  <p className="text-xs text-[#7c6a58]">{n.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Skill records — mastered ── */}
        {mastered.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] font-bold text-[#2d6b2a] uppercase tracking-wider mb-2">
              Skills mastered
            </div>
            <div className="flex flex-col gap-2">
              {mastered.map((r) => (
                <div key={r.skillId} className="bg-[#fffefb] border border-[#e4ddd0] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#2d2822] font-display">{SKILL_MAP[r.skillId]?.name ?? r.skillId}</div>
                    <div className="text-[10px] text-[#7c6a58]">{r.correctAttempts}/{r.attempts} correct</div>
                  </div>
                  <span className="text-emerald-600 text-xs font-semibold">Mastered</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Drill recommendations ── */}
        {struggling.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-bold text-[#5c2d6e] uppercase tracking-wider mb-2">
              Drill recommendations
            </div>
            <div className="flex flex-col gap-3">
              {struggling.map((r) => {
                const pct = r.attempts > 0 ? Math.round((r.correctAttempts / r.attempts) * 100) : 0;
                return (
                  <div key={r.skillId} className="bg-[#fffefb] border border-[#e4ddd0] rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-sm font-bold text-[#2d2822] font-display">{SKILL_MAP[r.skillId]?.name ?? r.skillId}</div>
                        <div className="text-[10px] text-[#7c6a58]">{r.correctAttempts}/{r.attempts} correct · {pct}%</div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        r.status === "struggling"
                          ? "bg-[#f0e8f5] text-[#5c2d6e]"
                          : "bg-[#f0e8da] text-[#7c5c3b]"
                      }`}>
                        {r.status === "struggling" ? "Struggling" : "Developing"}
                      </span>
                    </div>
                    <div className="h-1 bg-[#e4ddd0] rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-[#5c2d6e] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <button
                      onClick={() => onPractice(r.skillId)}
                      className="w-full bg-[#5c2d6e] hover:bg-[#7a3d8f] text-white text-xs font-bold font-display py-2 rounded-lg transition"
                    >
                      Start practice session →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {struggling.length === 0 && mastered.length > 0 && wrongNotes.length === 0 && (
          <div className="bg-[#f0e8f5] border border-[#c4a8d4] rounded-xl px-4 py-4 text-center mb-6">
            <div className="text-[#5c2d6e] text-sm font-bold font-display mb-1">You nailed it</div>
            <div className="text-[#7c6a58] text-xs">All skills mastered this session. Come back tomorrow to reinforce them.</div>
          </div>
        )}

        <button
          onClick={onDone}
          className="w-full border border-[#e4ddd0] text-[#7c6a58] hover:bg-[#f0e8da] text-sm font-semibold py-3 rounded-xl transition"
        >
          Done for now
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import DodoAvatar from "@/components/DodoAvatar";

export interface WorkStep {
  id: string;
  text: string;
}

interface Props {
  onSubmit: (steps: WorkStep[]) => void;
  isStreaming: boolean;
  failedAttempts: number;
  disabled?: boolean;
  /** true = tan background (main problem), false = white (drill) */
  warm?: boolean;
}

const SYMBOLS = [
  { label: "x²",   insert: "²" },
  { label: "x³",   insert: "³" },
  { label: "xⁿ",   insert: "^n" },
  { label: "√",    insert: "√" },
  { label: "·",    insert: " · " },
  { label: "d/dx", insert: "d/dx[" },
  { label: "∫",    insert: "∫" },
  { label: "π",    insert: "π" },
  { label: "±",    insert: "±" },
  { label: "≠",    insert: "≠" },
  { label: "∞",    insert: "∞" },
  { label: "≤",    insert: "≤" },
  { label: "≥",    insert: "≥" },
  { label: "⁻¹",   insert: "⁻¹" },
];

export default function WorkInput({
  onSubmit,
  isStreaming,
  failedAttempts,
  disabled,
  warm = false,
}: Props) {
  const [steps, setSteps] = useState<WorkStep[]>([
    { id: crypto.randomUUID(), text: "" },
  ]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const showHint = failedAttempts >= 3;

  function updateStep(id: string, text: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  }

  function addStep() {
    const newId = crypto.randomUUID();
    setSteps((prev) => [...prev, { id: newId, text: "" }]);
    setTimeout(() => inputRefs.current[newId]?.focus(), 50);
  }

  function removeStep(id: string) {
    if (steps.length === 1) return;
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, id: string, idx: number) {
    // ⌘↵ / Ctrl+↵ — submit all steps
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (idx === steps.length - 1) addStep();
      else {
        const next = steps[idx + 1];
        if (next) inputRefs.current[next.id]?.focus();
      }
    }
    if (e.key === "Backspace" && steps[idx].text === "" && steps.length > 1) {
      e.preventDefault();
      const prevStep = steps[idx - 1];
      removeStep(id);
      if (prevStep) setTimeout(() => inputRefs.current[prevStep.id]?.focus(), 30);
    }
  }

  function insertSymbol(insert: string, stepId: string) {
    const input = inputRefs.current[stepId];
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const newVal = input.value.slice(0, start) + insert + input.value.slice(end);
    updateStep(stepId, newVal);
    setTimeout(() => {
      input.focus();
      const pos = start + insert.length;
      input.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleSubmit() {
    const filled = steps.filter((s) => s.text.trim());
    if (!filled.length || isStreaming || disabled) return;
    onSubmit(filled);
    setSteps([{ id: crypto.randomUUID(), text: "" }]);
  }

  const hasContent = steps.some((s) => s.text.trim());
  const activeStepId = steps[steps.length - 1]?.id;

  const border   = warm ? "border-[#e4ddd0]" : "border-gray-700";
  const bg       = warm ? "bg-[#faf7f2]" : "bg-gray-950";
  const inputBg  = warm ? "bg-[#fffefb] border-[#e4ddd0] text-[#2d2822] placeholder-[#a88b72] focus:border-[#5c2d6e]" : "bg-gray-900 border-gray-700 text-white placeholder-gray-600 focus:border-emerald-600";
  const symBg    = warm ? "bg-[#fffefb] border-[#e4ddd0] text-[#4a3422] hover:border-[#5c2d6e] hover:bg-[#f0e8f5]" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-600 hover:text-white";
  const btnBg    = warm ? "bg-[#5c2d6e] hover:bg-[#7a3d8f]" : "bg-emerald-600 hover:bg-emerald-500";
  const numBg    = warm ? "bg-[#f0e8da] border-[#c4b8a8] text-[#7c5c3b]" : "bg-gray-800 border-gray-700 text-gray-500";
  const addColor = warm ? "text-[#a88b72] hover:text-[#7c5c3b]" : "text-gray-600 hover:text-gray-400";

  return (
    <div className={`border-t ${border} ${bg} px-4 pt-3 pb-4 flex-shrink-0`}>
      {/* Symbol panel */}
      <div className="flex flex-wrap gap-1 mb-3">
        {SYMBOLS.map((sym) => (
          <button
            key={sym.label}
            onMouseDown={(e) => {
              e.preventDefault();
              insertSymbol(sym.insert, activeStepId);
            }}
            disabled={disabled || isStreaming}
            className={`text-xs border rounded px-1.5 py-0.5 font-mono transition disabled:opacity-30 ${symBg}`}
          >
            {sym.label}
          </button>
        ))}
      </div>

      {/* Label — dodo runs here while streaming */}
      <div className={`flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-wider ${warm ? "text-[#7c6a58]" : "text-gray-500"}`}>
        {isStreaming && warm ? (
          <DodoAvatar size="sm" running={true} />
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        )}
        {isStreaming && warm ? <span className="font-display italic normal-case text-[11px] text-[#a88b72]">thinking…</span> : "Show your work"}
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1.5 mb-2">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[9px] font-semibold ${numBg}`}>
              {idx + 1}
            </div>
            <input
              ref={(el) => { inputRefs.current[step.id] = el; }}
              type="text"
              value={step.text}
              onChange={(e) => updateStep(step.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, step.id, idx)}
              placeholder={idx === 0 ? "Start with what you know…" : `Step ${idx + 1}…`}
              disabled={isStreaming || disabled}
              className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono transition disabled:opacity-50 outline-none focus:outline-none focus:ring-0 ${inputBg}`}
            />
            {steps.length > 1 && (
              <button
                onClick={() => removeStep(step.id)}
                className={`flex-shrink-0 transition ${warm ? "text-[#a88b72] hover:text-[#7c5c3b]" : addColor}`}
                aria-label="Remove step"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add step */}
      <button
        onClick={addStep}
        disabled={disabled || isStreaming}
        className={`flex items-center gap-1 text-xs mb-3 transition disabled:opacity-30 ${addColor}`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add step
      </button>

      {/* hint button */}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!hasContent || isStreaming || disabled}
          className={`text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-40 ${btnBg}`}
        >
          {isStreaming ? "Checking…" : "Submit work →"}
        </button>

        {showHint && (
          <button
            onClick={() => onSubmit([{ id: crypto.randomUUID(), text: "I need a hint — I'm stuck" }])}
            disabled={isStreaming || disabled}
            className={`text-xs border rounded-lg px-3 py-2 transition ${warm ? "border-[#e4ddd0] text-[#7c6a58] hover:text-[#2d2822]" : "border-gray-700 text-gray-500 hover:text-gray-300"}`}
          >
            I need a hint
          </button>
        )}
      </div>
    </div>
  );
}

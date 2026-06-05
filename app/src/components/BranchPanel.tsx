"use client";

import React, { useState, useRef, useEffect } from "react";
import MathRenderer from "@/components/MathRenderer";
import { WorkStep } from "@/components/WorkInput";

interface BranchMessage {
  id: string;
  role: "user" | "tutor";
  content: string;
}

interface Props {
  concept: string;           // e.g. "chain rule inner derivative"
  wrongStep: string;         // the student's actual wrong step text
  wrongStepIndex: number;    // 0-based index for display
  problem: string;           // original problem
  targetSkillId: string;
  studentId: string;
  onClose: () => void;
}

export default function BranchPanel({
  concept,
  wrongStep,
  wrongStepIndex,
  problem,
  targetSkillId,
  studentId,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<BranchMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startBranch() {
    setAccepted(true);
    await streamBranch([]);
  }

  async function streamBranch(history: BranchMessage[]) {
    setIsStreaming(true);
    const placeholderId = crypto.randomUUID();
    const placeholder: BranchMessage = { id: placeholderId, role: "tutor", content: "" };
    setMessages((prev) => [...prev, placeholder]);

    const systemPrompt = `You are Synapse, a warm math tutor running a focused drill session.

The student is working on: ${problem}

They made an error at Step ${wrongStepIndex + 1}: "${wrongStep}"

The concept that broke down: ${concept}

Your job in this branch session:
1. Ask ONE focused question about "${concept}" using a simpler version of the same context
2. If they get it right, briefly celebrate and tell them they're ready to go back and fix their original step
3. If they get it wrong, go simpler — same rules as the main session
4. Keep it short. This is a focused drill, not a full session.
5. Always use LaTeX for math: $...$ inline, $$...$$ display.
6. Never solve the original problem for them.`;

    const apiMessages = history.length > 0
      ? history.map((m) => ({ role: m.role === "tutor" ? "assistant" as const : "user" as const, content: m.content }))
      : [{ role: "user" as const, content: `I need help understanding "${concept}". My wrong step was: ${wrongStep}` }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          profile: {},
          problem,
          targetSkillId,
          studentId,
          systemPromptOverride: systemPrompt,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              accumulated += JSON.parse(data).text;
              // Strip any signal block for display
              const sigStart = accumulated.indexOf("<!--SKILL_UPDATE:");
              const clean = sigStart >= 0 ? accumulated.slice(0, sigStart).trim() : accumulated.trim();
              setMessages((prev) =>
                prev.map((m) => m.id === placeholderId ? { ...m, content: clean } : m)
              );
            } catch {}
          }
        }
      }
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  async function handleSend() {
    if (!input.trim() || isStreaming) return;
    const userMsg: BranchMessage = { id: crypto.randomUUID(), role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await streamBranch(newMessages);
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs font-semibold text-white">Diving deeper</span>
          <span className="text-xs text-gray-500">—</span>
          <span className="text-xs text-amber-400 font-medium">{concept}</span>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition" aria-label="Close branch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Wrong step callout */}
      <div className="mx-3 mt-3 flex-shrink-0 bg-red-950 border border-red-800 rounded-xl px-4 py-3">
        <div className="text-xs font-semibold text-red-400 mb-1">Step {wrongStepIndex + 1} — where things diverged</div>
        <MathRenderer text={wrongStep} className="text-red-200 text-sm font-mono" />
      </div>

      {/* Accept prompt or messages */}
      {!accepted ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
          <div className="text-center">
            <div className="text-white font-medium mb-2">Want to drill into this?</div>
            <div className="text-gray-400 text-sm mb-6">
              I'll ask you a focused question about <span className="text-amber-400">{concept}</span> so you can fix that step when you come back.
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={startBranch}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-5 py-2.5 rounded-xl transition"
              >
                Yes, let's drill it
              </button>
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-300 border border-gray-700 px-4 py-2.5 rounded-xl transition"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "tutor" && (
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-black text-[10px] font-bold flex-shrink-0 mt-0.5">N</div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === "tutor"
                    ? "bg-gray-800 rounded-tl-sm text-gray-100"
                    : "bg-blue-600 rounded-tr-sm text-white"
                }`}>
                  {msg.content ? (
                    <MathRenderer text={msg.content} className="leading-relaxed" />
                  ) : (
                    <div className="flex gap-1 py-1">
                      {[0,150,300].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-800 px-3 py-3 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="Your answer…"
              disabled={isStreaming}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-600 transition font-mono"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold px-3 py-2 rounded-xl transition text-sm"
            >
              →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

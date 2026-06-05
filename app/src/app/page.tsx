"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import MathRenderer from "@/components/MathRenderer";
import LessonsOverlay from "@/components/LessonsOverlay";
import ToolsBar from "@/components/ToolsBar";
import ActiveWindow from "@/components/ActiveWindow";
import type { DrillPrompt, DrillResolved } from "@/components/ActiveWindow";
import AssignmentSidebar from "@/components/AssignmentSidebar";
import SkillMenu from "@/components/SkillMenu";
import SessionSummary from "@/components/SessionSummary";
import type { SessionNote } from "@/components/SessionSummary";
import DodoAvatar from "@/components/DodoAvatar";
import { getOrCreateProfile, recordAttempt, profileStore } from "@/lib/profileStore";
import { parseSkillSignal, ScaffoldState, defaultScaffoldState, buildDrillOpeningPrompt } from "@/lib/promptEngine";
import { SKILL_MAP } from "@/data/skillGraph";
import { ensureStudent, insertAttempt, upsertSkillRecord, getSkillRecords, getPastSessions } from "@/lib/db";
import type { DbSession } from "@/lib/db";
import type { StudentProfile, SkillStatus } from "@/types";
import {
  BranchTree,
  BranchNode,
  BranchMessage,
  createRootNode,
  createDrillNode,
  buildMessageHistory,
} from "@/types/branch";
import type { WorkStep } from "@/components/WorkInput";

// ── Types ──────────────────────────────────────────────────

type AppState = "landing" | "uploading" | "problems" | "identifying" | "chatting" | "summary" | "gallery";

interface AssignmentProblem { index: number; text: string; }

interface ProblemState {
  tree: BranchTree;
  targetSkillId: string;
  sessionId: string | null;
  scaffold: ScaffoldState;
  failedAttempts: number;
  sessionTitle: string | null;
  drillPrompt: DrillPrompt | null;
  drillResolved: DrillResolved | null;
  sessionNotes: SessionNote[];
  problem: string;
}

// ── Minimized pane — 20% strip for inactive window ──────────

function MinimizedPane({
  node,
  label,
  onClick,
}: {
  node: BranchNode;
  label: string;
  onClick: () => void;
}) {
  const lastTutorMsg = [...node.messages].reverse().find((m) => m.role === "tutor");
  return (
    <div
      onClick={onClick}
      className="flex flex-col bg-[#faf7f2] border-l border-[#e4ddd0] cursor-pointer opacity-50 hover:opacity-75 transition-opacity overflow-hidden"
      style={{ width: "20%" }}
    >
      {/* Header — matches ActiveWindow header height; text wraps rather than truncating */}
      <div className="px-3 py-3 border-b border-[#e4ddd0] flex-shrink-0 min-h-[50px] flex items-center">
        <div className="min-w-0">
          <div className="font-display text-base font-bold text-[#2d2822] leading-snug">{label}</div>
          <div className="text-[9px] font-semibold text-[#5c2d6e] uppercase tracking-wider mt-0.5">
            {node.origin === "root" ? "main problem" : "drill"} · tap to resume
          </div>
        </div>
      </div>
      {lastTutorMsg && (
        <div className="px-3 py-2 flex-1 overflow-hidden">
          <p className="text-[10px] text-[#7c6a58] leading-relaxed line-clamp-6">
            {lastTutorMsg.content.slice(0, 180)}
          </p>
        </div>
      )}
      <div className="px-3 py-2 border-t border-[#e4ddd0] mt-auto flex-shrink-0">
        <div className="text-[9px] font-bold text-[#5c2d6e] uppercase tracking-wider">Resume →</div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────

export default function TutorPage() {
  const [appState, setAppState]             = useState<AppState>("landing");
  const [problem, setProblem]               = useState("");
  const [targetSkillId, setTargetSkillId]   = useState<string | null>(null);
  const [sessionTitle, setSessionTitle]     = useState<string | null>(null);
  const [profile, setProfile]               = useState<StudentProfile | null>(null);
  const [studentId, setStudentId]           = useState("");
  const [sessionId, setSessionId]           = useState<string | null>(null);
  const [scaffold, setScaffold]             = useState<ScaffoldState>(defaultScaffoldState());
  const [isStreaming, setIsStreaming]        = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [drillResolved, setDrillResolved]   = useState<DrillResolved | null>(null);
  const [showSkillMenu, setShowSkillMenu]   = useState(false);
  const [pastSessions, setPastSessions]     = useState<DbSession[]>([]);
  const [tree, setTree]                     = useState<BranchTree | null>(null);
  const [drillPrompt, setDrillPrompt]       = useState<DrillPrompt | null>(null);
  const [sessionNotes, setSessionNotes]     = useState<SessionNote[]>([]);
  const [completedProblemIndices, setCompletedProblemIndices] = useState<number[]>([]);

  // Assignment mode
  const [assignmentProblems, setAssignmentProblems] = useState<AssignmentProblem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [uploadError, setUploadError]       = useState<string | null>(null);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  // Per-problem saved state (persists when switching problems)
  const problemStatesRef = useRef<Record<number, ProblemState>>({});

  useEffect(() => {
    setProfile(getOrCreateProfile());
    ensureStudent().then(setStudentId);
  }, []);

  const refreshProfile = useCallback(() => setProfile(profileStore.getProfile()), []);

  // ── Tree helpers ──────────────────────────────────────────

  function updateNode(nodeId: string, updater: (n: BranchNode) => BranchNode) {
    setTree((prev) => {
      if (!prev) return prev;
      const node = prev.nodes[nodeId];
      if (!node) return prev;
      return { ...prev, nodes: { ...prev.nodes, [nodeId]: updater(node) } };
    });
  }

  function appendMessage(nodeId: string, msg: BranchMessage) {
    updateNode(nodeId, (n) => ({ ...n, messages: [...n.messages, msg] }));
  }

  function updateLastMessage(nodeId: string, updater: (m: BranchMessage) => BranchMessage) {
    updateNode(nodeId, (n) => {
      if (!n.messages.length) return n;
      const msgs = [...n.messages];
      msgs[msgs.length - 1] = updater(msgs[msgs.length - 1]);
      return { ...n, messages: msgs };
    });
  }

  function setActiveNode(nodeId: string) {
    setTree((prev) => prev ? { ...prev, activeNodeId: nodeId } : prev);
    updateNode(nodeId, (n) => n.status === "open" ? { ...n, status: "active" } : n);
  }

  function addChildNode(parentId: string, child: BranchNode) {
    setTree((prev) => {
      if (!prev) return prev;
      const parent = prev.nodes[parentId];
      if (!parent) return prev;
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [parentId]: { ...parent, childIds: [...parent.childIds, child.id] },
          [child.id]: child,
        },
        activeNodeId: child.id,
      };
    });
  }

  // ── Stream a tutor message into a node ───────────────────

  async function streamIntoNode(nodeId: string, skillId: string, systemPromptOverride?: string, problemOverride?: string) {
    if (!profile && !systemPromptOverride) return;
    setIsStreaming(true);

    const placeholderId = crypto.randomUUID();
    const placeholder: BranchMessage = {
      id: placeholderId, role: "tutor", content: "", rawContent: "",
      timestamp: new Date().toISOString(),
    };
    appendMessage(nodeId, placeholder);

    try {
      const currentTree = await new Promise<BranchTree | null>((resolve) => {
        setTree((t) => { resolve(t); return t; });
      });
      const node = currentTree?.nodes[nodeId];
      const history = node ? buildMessageHistory(node).slice(0, -1) : [];
      const currentProfile = profileStore.getProfile() ?? getOrCreateProfile();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.length > 0
            ? history
            : [{ role: "user", content: "I need help with this problem. Can you show it to me and let me try first?" }],
          profile: currentProfile,
          problem: problemOverride ?? problem,
          targetSkillId: skillId,
          scaffold,
          studentId,
          systemPromptOverride,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            accumulated += JSON.parse(data).text;
            const { cleanText } = parseSkillSignal(accumulated);
            updateLastMessage(nodeId, (m) => ({ ...m, content: cleanText, rawContent: accumulated }));
          } catch {}
        }
      }

      const { signal } = parseSkillSignal(accumulated);
      if (signal) {
        if (!signal.correct) setFailedAttempts((c) => c + 1);
        else setFailedAttempts(0);

        const nodeSnap = await new Promise<BranchNode | undefined>((resolve) => {
          setTree((t) => { resolve(t?.nodes[nodeId]); return t; });
        });
        const lastUserMsg = nodeSnap?.messages.slice().reverse().find((m) => m.role === "user");
        if (studentId && lastUserMsg) {
          await insertAttempt(studentId, signal.skillId, sessionId, lastUserMsg.content, lastUserMsg.content, signal.correct, signal.notes);
          const records = await getSkillRecords(studentId);
          const existing = records.find((r) => r.skill_id === signal.skillId);
          const attempts = (existing?.attempts ?? 0) + 1;
          const correct  = (existing?.correct_attempts ?? 0) + (signal.correct ? 1 : 0);
          const pct = correct / attempts;
          const status: SkillStatus = attempts < 2 ? "introduced" : pct === 0 ? "struggling" : pct >= 0.67 ? "mastered" : "developing";
          await upsertSkillRecord(studentId, signal.skillId, status, attempts, correct);
        }

        recordAttempt(signal.skillId, "", "", signal.correct, signal.notes);
        refreshProfile();

        setScaffold((prev) => ({
          ...prev,
          currentRungIndex: signal.newRungIndex ?? prev.currentRungIndex,
          direction: signal.direction ?? prev.direction,
          masteredSkillIds: signal.correct && !prev.masteredSkillIds.includes(signal.skillId)
            ? [...prev.masteredSkillIds, signal.skillId]
            : prev.masteredSkillIds,
          consecutiveCorrect: signal.correct ? prev.consecutiveCorrect + 1 : 0,
        }));

        const currentTreeSnap = await new Promise<BranchTree | null>((resolve) => {
          setTree((t) => { resolve(t); return t; });
        });

        // Wrong step → show drill prompt at any depth (drills can spawn sub-drills)
        if (signal.wrongStepIndex !== null && signal.wrongStepConcept) {
          const freshNode = currentTreeSnap?.nodes[nodeId];
          const lastUser = freshNode?.messages.slice().reverse().find((m) => m.role === "user");
          if (lastUser) {
            const stepLines = lastUser.content.split("\n");
            const wrongLine = stepLines[signal.wrongStepIndex] ?? lastUser.content;
            const stepText  = wrongLine.replace(/^Step \d+:\s*/, "");
            setDrillPrompt({
              nodeId, wrongStepIndex: signal.wrongStepIndex,
              wrongStepConcept: signal.wrongStepConcept, stepText, skillId: signal.skillId,
            });
          }
        }

        // Correct on root problem → mark this assignment problem as completed
        if (signal.correct && nodeId === currentTreeSnap?.rootId && assignmentProblems.length > 0) {
          setCompletedProblemIndices((prev) =>
            prev.includes(currentProblemIndex) ? prev : [...prev, currentProblemIndex]
          );
        }

        // Correct on drill → mark resolved, show move-on button
        if (signal.correct && nodeId !== currentTreeSnap?.rootId) {
          updateNode(nodeId, (n) => ({ ...n, status: "resolved" }));
          const masteredNode = currentTreeSnap?.nodes[nodeId];
          const concept = masteredNode?.concept ?? "this concept";
          setDrillResolved({ nodeId, concept });
          setSessionNotes((prev) => [
            ...prev,
            { type: "mastered", concept, detail: signal.notes, skillId: signal.skillId },
          ]);
        }

        // Accumulate key notes
        if (!signal.correct && signal.notes) {
          const skillName = SKILL_MAP[signal.skillId]?.name ?? signal.skillId;
          setSessionNotes((prev) => {
            if (prev.some((n) => n.type === "note" && n.concept === skillName && n.detail === signal.notes)) return prev;
            return [...prev, { type: "note", concept: skillName, detail: signal.notes, skillId: signal.skillId }];
          });
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }

  // ── Accept drill prompt ───────────────────────────────────

  async function handleDrillAccept() {
    if (!drillPrompt || !tree) return;
    const { nodeId, wrongStepConcept, stepText, skillId, wrongStepIndex } = drillPrompt;
    setDrillPrompt(null);
    setDrillResolved(null);

    const child = createDrillNode(nodeId, wrongStepConcept, wrongStepConcept, "wrong-step", stepText, skillId, wrongStepIndex);
    addChildNode(nodeId, child);
    setSessionNotes((prev) => [
      ...prev,
      { type: "wrong", concept: wrongStepConcept, detail: `Step ${wrongStepIndex + 1}: ${stepText}`, skillId },
    ]);

    const openingPrompt = buildDrillOpeningPrompt(wrongStepConcept, stepText, problem, skillId);

    await new Promise((r) => setTimeout(r, 80));
    await streamIntoNode(child.id, skillId, openingPrompt);
  }

  function handleDrillSkip() {
    setDrillPrompt(null);
    setDrillResolved(null);
  }

  // ── Submit work ──────────────────────────────────────────

  async function handleSubmitWork(steps: WorkStep[]) {
    if (!tree || isStreaming || !targetSkillId) return;
    const activeNodeId = tree.activeNodeId;
    const content = steps.map((s, i) => `Step ${i + 1}: ${s.text}`).join("\n");
    const userMsg: BranchMessage = {
      id: crypto.randomUUID(), role: "user", content, rawContent: content,
      timestamp: new Date().toISOString(),
    };
    appendMessage(activeNodeId, userMsg);
    await streamIntoNode(activeNodeId, targetSkillId);
  }

  // ── Highlight-to-drill ────────────────────────────────────

  async function handleHighlight(text: string, userContext?: string) {
    if (!tree || !targetSkillId) return;
    const activeNodeId = tree.activeNodeId;
    const child = createDrillNode(
      activeNodeId, text.length > 30 ? text.slice(0, 30) + "…" : text,
      text, "highlight", text, targetSkillId
    );
    addChildNode(activeNodeId, child);

    const contextLine = userContext
      ? `The student specifically wants to understand: "${userContext}"`
      : `Ask ONE focused question about "${text}" in the context of ${problem}.`;

    const systemPrompt = `You are a warm math tutor running a focused drill.
The student is working on: ${problem}
They highlighted this phrase: "${text}"
${contextLine}
Keep it short and use LaTeX for math.`;

    const openerContent = userContext
      ? `I highlighted "${text}" — ${userContext}`
      : `I highlighted "${text}" — I want to understand this better.`;

    const opener: BranchMessage = {
      id: crypto.randomUUID(), role: "user",
      content: openerContent,
      rawContent: openerContent,
      timestamp: new Date().toISOString(),
    };
    setTimeout(async () => {
      setTree((prev) => {
        if (!prev) return prev;
        const node = prev.nodes[child.id];
        if (!node) return prev;
        return { ...prev, nodes: { ...prev.nodes, [child.id]: { ...node, messages: [opener] } } };
      });
      await streamIntoNode(child.id, targetSkillId, systemPrompt);
    }, 100);
  }

  // ── Dismiss drill (move back to parent problem) ──────────

  function handleDismissDrill() {
    setDrillResolved(null);
    setDrillPrompt(null); // clear any pending prompt on the parent too
    if (!tree) return;
    const active = tree.nodes[tree.activeNodeId];
    const parentId = active?.parentId ?? tree.rootId;
    setActiveNode(parentId);
  }

  // ── Save / restore per-problem state ─────────────────────

  function saveProblemState(idx: number) {
    if (!tree || !targetSkillId) return;
    problemStatesRef.current[idx] = {
      tree, targetSkillId, sessionId, scaffold, failedAttempts,
      sessionTitle, drillPrompt, drillResolved, sessionNotes, problem,
    };
  }

  // ── Start session ─────────────────────────────────────────

  async function handleSubmitProblem(problemText?: string) {
    const p = problemText ?? problem;
    if (!p.trim()) return;
    if (!problemText) setProblem(p);
    setAppState("identifying");

    try {
      const res = await fetch("/api/identify-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: p }),
      });
      const { skillId, sessionTitle: title } = await res.json();
      setTargetSkillId(skillId);
      setSessionTitle(title ?? null);

      const root = createRootNode(p, skillId);
      const newTree: BranchTree = { nodes: { [root.id]: root }, rootId: root.id, activeNodeId: root.id };
      setTree(newTree);
      setScaffold(defaultScaffoldState());
      setFailedAttempts(0);
      setDrillResolved(null);
      setDrillPrompt(null);
      setSessionNotes([]);

      const { createSession } = await import("@/lib/db");
      const sid = await createSession(studentId, p, skillId);
      setSessionId(sid);

      setAppState("chatting");
      await streamIntoNode(root.id, skillId, undefined, p);
    } catch (err) {
      console.error(err);
      setAppState("landing");
    }
  }

  // ── Switch problem in assignment mode ─────────────────────

  async function handleSwitchProblem(newIndex: number) {
    if (newIndex === currentProblemIndex && appState === "chatting") return;

    // Save current state before switching
    saveProblemState(currentProblemIndex);

    const saved = problemStatesRef.current[newIndex];
    if (saved) {
      // Restore — no API call needed
      setTree(saved.tree);
      setTargetSkillId(saved.targetSkillId);
      setSessionId(saved.sessionId);
      setScaffold(saved.scaffold);
      setFailedAttempts(saved.failedAttempts);
      setSessionTitle(saved.sessionTitle);
      setDrillPrompt(saved.drillPrompt);
      setDrillResolved(saved.drillResolved);
      setSessionNotes(saved.sessionNotes);
      setProblem(saved.problem);
      setCurrentProblemIndex(newIndex);
      setAppState("chatting");
      return;
    }

    // First visit — run full flow
    setCurrentProblemIndex(newIndex);
    const p = assignmentProblems[newIndex];
    if (p) {
      setProblem(p.text);
      await handleSubmitProblem(p.text);
    }
  }

  // ── PDF upload ─────────────────────────────────────────────

  async function handleUploadPDF(file: File) {
    setUploadError(null);
    setAppState("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-assignment", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAssignmentProblems(data.problems);
      setCurrentProblemIndex(0);
      problemStatesRef.current = {}; // clear saved states for new assignment
      setCompletedProblemIndices([]);
      setAppState("problems");
    } catch {
      setUploadError("Couldn't parse the PDF — make sure it's a math assignment.");
      setAppState("landing");
    }
  }

  async function handleStartProblem(problemText: string) {
    setProblem(problemText);
    await handleSubmitProblem(problemText);
  }

  // ── Practice session from summary ─────────────────────────

  async function handlePractice(skillId: string) {
    const skill = SKILL_MAP[skillId];
    if (!skill) return;
    const practicePrompt = `Practice: ${skill.name} — ${skill.exampleQuestion}`;
    setProblem(practicePrompt);
    await handleSubmitProblem(practicePrompt);
  }

  // ── Navigation helpers ────────────────────────────────────

  function handleGoHome() {
    setAppState("landing");
    setTree(null);
    setProblem("");
    setTargetSkillId(null);
    setSessionTitle(null);
    setScaffold(defaultScaffoldState());
    setDrillPrompt(null);
    setDrillResolved(null);
  }

  async function handleOpenGallery() {
    const sessions = await getPastSessions(studentId);
    setPastSessions(sessions);
    setAppState("gallery");
  }

  // ── Render ────────────────────────────────────────────────

  if (appState === "gallery") {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col">
        <div className="bg-[#fffefb] border-b border-[#e4ddd0] px-6 py-4 flex items-center gap-4">
          <button onClick={handleGoHome} className="hover:opacity-70 transition-opacity" aria-label="Go home">
            <DodoAvatar size="sm" />
          </button>
          <h1 className="font-display text-xl font-bold text-[#2d2822]">Past sessions</h1>
          <button onClick={handleGoHome} className="ml-auto text-xs text-[#7c6a58] hover:text-[#2d2822] transition">← Back</button>
        </div>
        <div className="flex-1 p-6">
          {pastSessions.length === 0 ? (
            <div className="text-center py-20">
              <div className="flex justify-center mb-4"><DodoAvatar size="md" /></div>
              <p className="text-[#7c6a58] font-body text-sm">No sessions yet — start your first problem!</p>
            </div>
          ) : (
            <div className="grid gap-4 max-w-3xl mx-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {pastSessions.map((s) => {
                const skill = SKILL_MAP[s.target_skill_id];
                const date = new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                return (
                  <div key={s.id} className="bg-[#fffefb] border border-[#e4ddd0] rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-[#5c2d6e] uppercase tracking-wider mb-2 font-display">
                      {skill?.name ?? s.target_skill_id}
                    </div>
                    <p className="text-sm text-[#2d2822] leading-snug mb-3 line-clamp-3">{s.original_problem}</p>
                    <div className="text-[10px] text-[#a88b72]">{date}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (appState === "landing") {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4"><DodoAvatar size="md" /></div>
            <h1 className="font-display text-4xl font-bold text-[#2d2822] mb-2 tracking-tight">Synapse</h1>
            <p className="text-base text-[#7c6a58] font-body">Paste a problem or upload an assignment.<br/>I&apos;ll guide you — no shortcuts.</p>
          </div>
          <div className="bg-[#fffefb] rounded-2xl border border-[#e4ddd0] p-5 shadow-sm mb-4">
            <label className="block text-xs font-bold text-[#7c6a58] uppercase tracking-wider mb-2 font-display">Type a problem</label>
            <textarea
              className="w-full bg-[#faf7f2] text-[#2d2822] rounded-xl p-3 text-sm resize-none border border-[#e4ddd0] focus:outline-none focus:border-[#5c2d6e] transition placeholder-[#a88b72] font-mono"
              rows={4}
              placeholder="e.g. Find the derivative of f(x) = (3x² + 1)⁵"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitProblem(); }}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-[10px] text-[#a88b72]">⌘↵ to submit</span>
              <button
                onClick={() => handleSubmitProblem()}
                disabled={!problem.trim()}
                className="bg-[#5c2d6e] hover:bg-[#7a3d8f] disabled:opacity-40 text-white font-bold font-display px-5 py-2 rounded-xl transition text-sm"
              >
                Start Session →
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#e4ddd0]" />
            <span className="text-[#a88b72] text-xs">or</span>
            <div className="flex-1 h-px bg-[#e4ddd0]" />
          </div>
          <div
            className="bg-[#fffefb] rounded-2xl border-2 border-dashed border-[#c4b8a8] hover:border-[#5c2d6e] transition p-8 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === "application/pdf") handleUploadPDF(f); }}
          >
            <div className="text-3xl mb-2">📄</div>
            <p className="text-[#2d2822] font-bold font-display text-sm mb-1">Upload a PDF assignment</p>
            <p className="text-[#a88b72] text-xs">I&apos;ll extract all problems and walk through them one by one</p>
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadPDF(f); }} />
          </div>
          {uploadError && <p className="text-red-500 text-xs text-center mt-3">{uploadError}</p>}
        </div>
      </div>
    );
  }

  if (appState === "uploading") {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5c2d6e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#2d2822] font-bold font-display">Reading your assignment…</p>
          <p className="text-[#7c6a58] text-sm">Extracting problems</p>
        </div>
      </div>
    );
  }

  if (appState === "problems") {
    const total   = assignmentProblems.length;
    const current = assignmentProblems[currentProblemIndex];
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl font-bold text-[#2d2822] mb-1">Your Assignment</h2>
            <p className="text-[#7c6a58] text-sm font-body">Found {total} problem{total !== 1 ? "s" : ""}. Let&apos;s go one at a time.</p>
          </div>
          <div className="flex gap-1.5 mb-6">
            {assignmentProblems.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < currentProblemIndex ? "bg-[#5c2d6e]" : i === currentProblemIndex ? "bg-[#7c5c3b]" : "bg-[#e4ddd0]"}`} />
            ))}
          </div>
          <div className="bg-[#fffefb] rounded-2xl border border-[#e4ddd0] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-[#5c2d6e] text-white text-xs font-bold px-2.5 py-1 rounded-full font-display">Problem {current.index} of {total}</span>
            </div>
            <MathRenderer text={current.text} className="text-[#2d2822] text-sm leading-relaxed" />
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => handleStartProblem(current.text)}
                className="bg-[#5c2d6e] hover:bg-[#7a3d8f] text-white font-bold font-display px-5 py-2.5 rounded-xl transition text-sm"
              >
                Start Problem {current.index} →
              </button>
            </div>
          </div>
          <button onClick={() => { setAppState("landing"); setUploadError(null); }} className="text-xs text-[#a88b72] hover:text-[#7c6a58] transition mt-4 mx-auto block">
            ← Upload different file
          </button>
        </div>
      </div>
    );
  }

  if (appState === "identifying") {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5c2d6e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#7c6a58]">Analysing your problem…</p>
        </div>
      </div>
    );
  }

  if (appState === "summary") {
    const results = Object.values(profile?.skillRecords ?? {}).map((r) => ({
      skillId: r.skillId, status: r.status,
      correctAttempts: r.correctAttempts, attempts: r.attempts,
    }));
    return (
      <SessionSummary
        results={results}
        sessionNotes={sessionNotes}
        onPractice={handlePractice}
        onDone={() => setAppState("landing")}
      />
    );
  }

  // ── CHATTING ─────────────────────────────────────────────

  if (!tree) return null;

  const activeNode = tree.nodes[tree.activeNodeId];
  const rootNode   = tree.nodes[tree.rootId];
  const rootIsActive = tree.activeNodeId === tree.rootId;
  const isAssignment = assignmentProblems.length > 0;

  // Determine split view
  // Other pane = the drill node (if root is active) OR the root node (if drill is active)
  let otherPaneNode: BranchNode | null = null;
  if (!rootIsActive) {
    otherPaneNode = rootNode; // drill is active → root is the other pane
  } else if (rootNode.childIds.length > 0) {
    const lastChildId = rootNode.childIds[rootNode.childIds.length - 1];
    otherPaneNode = tree.nodes[lastChildId] ?? null; // root is active → most recent drill is other pane
  }
  const hasSplitView = !!otherPaneNode;

  const activePaneLabel = rootIsActive
    ? (sessionTitle ?? "Session")
    : (activeNode.concept ?? activeNode.label);

  const otherPaneLabel = otherPaneNode
    ? (otherPaneNode.origin === "root" ? (sessionTitle ?? "Session") : (otherPaneNode.concept ?? otherPaneNode.label))
    : "";

  return (
    <div className="h-screen flex overflow-hidden relative">

      {/* Skinny tools bar — always left */}
      <ToolsBar
        onHome={handleGoHome}
        onGallery={handleOpenGallery}
        onNew={handleGoHome}
        onSkills={() => setShowSkillMenu((v) => !v)}
      />

      {/* Assignment sidebar — left of chat area, only in assignment mode */}
      {isAssignment && (
        <AssignmentSidebar
          problems={assignmentProblems}
          currentIndex={currentProblemIndex}
          completedIndices={completedProblemIndices}
          startedIndices={Object.keys(problemStatesRef.current).map(Number).concat(currentProblemIndex)}
          onSelectProblem={handleSwitchProblem}
        />
      )}

      {/* Chat area — split view */}
      <div className="flex flex-1 overflow-hidden">

        {/* Minimized pane — always on the LEFT, regardless of which window is active */}
        {hasSplitView && otherPaneNode && (
          <>
            <MinimizedPane
              node={otherPaneNode}
              label={otherPaneLabel}
              onClick={() => setActiveNode(otherPaneNode!.id)}
            />
            <div className="w-px flex-shrink-0 bg-[#e4ddd0]" />
          </>
        )}

        {/* Active pane — takes remaining space */}
        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${hasSplitView ? "flex-[4]" : "flex-1"}`}>
          <ActiveWindow
            node={activeNode}
            problem={problem}
            sessionTitle={sessionTitle}
            isStreaming={isStreaming}
            failedAttempts={failedAttempts}
            drillResolved={drillResolved}
            drillPrompt={drillPrompt}
            onSubmitWork={handleSubmitWork}
            onDismissDrill={handleDismissDrill}
            onHighlight={handleHighlight}
            onAcceptDrill={handleDrillAccept}
            onSkipDrill={handleDrillSkip}
          />
        </div>
      </div>

      {/* Floating Lessons overlay — top-right, both modes */}
      <LessonsOverlay tree={tree} onSelect={setActiveNode} />

      {/* Bottom-right — next problem button */}
      {isAssignment && (
        <div className="absolute bottom-4 right-4 z-20">
          <button
            onClick={() => {
              saveProblemState(currentProblemIndex);
              const next = currentProblemIndex + 1;
              if (next < assignmentProblems.length) {
                handleSwitchProblem(next);
              } else {
                setAssignmentProblems([]);
                setCurrentProblemIndex(0);
                setAppState("summary");
                setTree(null);
                setProblem("");
                setTargetSkillId(null);
                setScaffold(defaultScaffoldState());
                setDrillPrompt(null);
              }
            }}
            className="text-sm text-[#5c2d6e] bg-[#f0e8f5] hover:bg-[#e4d4ee] border border-[#c4a8d4] px-4 py-2 rounded-xl transition font-bold font-display shadow-sm"
          >
            {currentProblemIndex + 1 < assignmentProblems.length ? `Next problem →` : "Finish assignment"}
          </button>
        </div>
      )}

      {showSkillMenu && (
        <SkillMenu
          profile={profile}
          targetSkillId={targetSkillId}
          masteredSkillIds={scaffold.masteredSkillIds}
          currentRungIndex={scaffold.currentRungIndex}
          onClose={() => setShowSkillMenu(false)}
        />
      )}
    </div>
  );
}

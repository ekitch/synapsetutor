/**
 * db.ts
 *
 * Supabase-backed data layer. Replaces the localStorage profileStore.
 *
 * Key design: student identity is a UUID stored in localStorage —
 * no login required, but data persists across sessions on the same browser.
 * When auth is added later, swap getOrCreateStudentId() for the auth user ID.
 */

import { supabase } from "@/lib/supabase";
import type { SkillStatus } from "@/types";

// ── Student identity ───────────────────────────────────────

const STUDENT_ID_KEY = "tutor_student_id";

export function getOrCreateStudentId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STUDENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STUDENT_ID_KEY, id);
  }
  return id;
}

/** Ensure a row exists in the students table for this browser. */
export async function ensureStudent(): Promise<string> {
  const id = getOrCreateStudentId();
  if (!id) return id;

  const { error } = await supabase
    .from("students")
    .upsert({ id }, { onConflict: "id", ignoreDuplicates: true });

  if (error) console.error("[ensureStudent]", error.message);
  return id;
}

// ── Skill records ──────────────────────────────────────────

export interface DbSkillRecord {
  skill_id: string;
  status: SkillStatus;
  attempts: number;
  correct_attempts: number;
  last_tested_at: string | null;
}

export async function getSkillRecords(studentId: string): Promise<DbSkillRecord[]> {
  const { data, error } = await supabase
    .from("skill_records")
    .select("skill_id, status, attempts, correct_attempts, last_tested_at")
    .eq("student_id", studentId);

  if (error) {
    console.error("[getSkillRecords]", error.message);
    return [];
  }
  return data ?? [];
}

export async function upsertSkillRecord(
  studentId: string,
  skillId: string,
  status: SkillStatus,
  attempts: number,
  correctAttempts: number
): Promise<void> {
  const { error } = await supabase.from("skill_records").upsert(
    {
      student_id: studentId,
      skill_id: skillId,
      status,
      attempts,
      correct_attempts: correctAttempts,
      last_tested_at: new Date().toISOString(),
    },
    { onConflict: "student_id,skill_id" }
  );

  if (error) console.error("[upsertSkillRecord]", error.message);
}

// ── Skill attempts ─────────────────────────────────────────

export interface DbSkillAttempt {
  id: string;
  skill_id: string;
  session_id: string | null;
  question_asked: string;
  student_response: string;
  correct: boolean;
  ai_notes: string | null;
  created_at: string;
}

export async function insertAttempt(
  studentId: string,
  skillId: string,
  sessionId: string | null,
  questionAsked: string,
  studentResponse: string,
  correct: boolean,
  aiNotes: string
): Promise<void> {
  const { error } = await supabase.from("skill_attempts").insert({
    student_id: studentId,
    skill_id: skillId,
    session_id: sessionId,
    question_asked: questionAsked,
    student_response: studentResponse,
    correct,
    ai_notes: aiNotes,
  });

  if (error) console.error("[insertAttempt]", error.message);
}

/**
 * Fetch the N most recent CORRECT attempts for a given skill.
 * These are injected into the system prompt as "past examples the student knows."
 */
export async function getPastExamples(
  studentId: string,
  skillId: string,
  limit = 3
): Promise<DbSkillAttempt[]> {
  const { data, error } = await supabase
    .from("skill_attempts")
    .select("*")
    .eq("student_id", studentId)
    .eq("skill_id", skillId)
    .eq("correct", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getPastExamples]", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch past examples across ALL skills in a prerequisite path —
 * used to build the "remember when..." context block in the prompt.
 */
export async function getPastExamplesForSkills(
  studentId: string,
  skillIds: string[],
  limitPerSkill = 1
): Promise<Record<string, DbSkillAttempt[]>> {
  if (skillIds.length === 0) return {};

  const { data, error } = await supabase
    .from("skill_attempts")
    .select("*")
    .eq("student_id", studentId)
    .in("skill_id", skillIds)
    .eq("correct", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPastExamplesForSkills]", error.message);
    return {};
  }

  // Group by skill_id, take up to limitPerSkill per skill
  const grouped: Record<string, DbSkillAttempt[]> = {};
  for (const attempt of data ?? []) {
    if (!grouped[attempt.skill_id]) grouped[attempt.skill_id] = [];
    if (grouped[attempt.skill_id].length < limitPerSkill) {
      grouped[attempt.skill_id].push(attempt);
    }
  }
  return grouped;
}

// ── Sessions ───────────────────────────────────────────────

export async function createSession(
  studentId: string,
  originalProblem: string,
  targetSkillId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      student_id: studentId,
      original_problem: originalProblem,
      target_skill_id: targetSkillId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createSession]", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function endSession(sessionId: string): Promise<void> {
  await supabase
    .from("sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export interface DbSession {
  id: string;
  original_problem: string;
  target_skill_id: string;
  created_at: string;
  ended_at: string | null;
}

export async function getPastSessions(studentId: string, limit = 30): Promise<DbSession[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, original_problem, target_skill_id, created_at, ended_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getPastSessions]", error.message);
    return [];
  }
  return data ?? [];
}

// ── Skill status summary (for prompt serialization) ────────

export function serializeSkillRecordsForPrompt(records: DbSkillRecord[]): string {
  const active = records.filter((r) => r.status !== "unknown");
  if (active.length === 0) return "No skill history yet — this is the student's first session.";

  return active
    .map((r) => {
      const pct = r.attempts > 0
        ? Math.round((r.correct_attempts / r.attempts) * 100)
        : 0;
      return `• ${r.skill_id}: ${r.status} (${r.correct_attempts}/${r.attempts} correct, ${pct}%)`;
    })
    .join("\n");
}

/**
 * Build the "remember when..." context block for the system prompt.
 * Example output:
 *   Power Rule: last week you solved d/dx[x^4] = 4x^3 correctly.
 *   Chain Rule: you previously worked through d/dx[(x+1)^2] = 2(x+1).
 */
export function buildPastExamplesBlock(
  pastExamples: Record<string, DbSkillAttempt[]>
): string {
  const entries = Object.entries(pastExamples).filter(([, attempts]) => attempts.length > 0);
  if (entries.length === 0) return "No relevant past examples on record yet.";

  return entries
    .map(([skillId, attempts]) => {
      const ex = attempts[0];
      const when = formatRelativeTime(ex.created_at);
      return `• [${skillId}] ${when}, the student correctly answered: "${ex.question_asked}" — their response: "${ex.student_response}"`;
    })
    .join("\n");
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "earlier today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

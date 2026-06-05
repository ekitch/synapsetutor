/**
 * profileStore.ts
 *
 * localStorage-backed implementation of ProfileStore.
 * All callers import from this file. To swap in a real DB later,
 * replace the body of each function — the interface stays the same.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ProfileStore,
  StudentProfile,
  SkillRecord,
  SkillAttempt,
  SkillStatus,
} from "@/types";

const STORAGE_KEY = "tutor_student_profile";

// ── helpers ────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function emptyProfile(): StudentProfile {
  return {
    id: uuidv4(),
    createdAt: now(),
    skillRecords: {},
  };
}

function emptySkillRecord(skillId: string): SkillRecord {
  return {
    skillId,
    status: "unknown",
    attempts: 0,
    correctAttempts: 0,
    lastTestedAt: null,
    history: [],
  };
}

/**
 * Derive a new SkillStatus from an existing record after an attempt.
 * Rules:
 *   - 0 correct out of last 3 → struggling
 *   - ≥2 correct out of last 3 → mastered
 *   - otherwise → developing
 */
function deriveStatus(record: SkillRecord, correct: boolean): SkillStatus {
  const recentHistory = [...record.history.slice(-2), { correct }]; // last 3 including this one
  const recentCorrect = recentHistory.filter((h) => h.correct).length;

  if (recentCorrect === 0) return "struggling";
  if (recentCorrect >= 2) return "mastered";
  return "developing";
}

// ── ProfileStore implementation ────────────────────────────

export const profileStore: ProfileStore = {
  getProfile(): StudentProfile | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StudentProfile;
    } catch {
      return null;
    }
  },

  saveProfile(profile: StudentProfile): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  },

  updateSkillRecord(
    skillId: string,
    attempt: SkillAttempt,
    newStatus: SkillStatus
  ): void {
    let profile = this.getProfile() ?? emptyProfile();

    const existing = profile.skillRecords[skillId] ?? emptySkillRecord(skillId);

    const updated: SkillRecord = {
      ...existing,
      attempts: existing.attempts + 1,
      correctAttempts: existing.correctAttempts + (attempt.correct ? 1 : 0),
      lastTestedAt: attempt.timestamp,
      status: newStatus,
      history: [...existing.history, attempt],
    };

    profile = {
      ...profile,
      skillRecords: {
        ...profile.skillRecords,
        [skillId]: updated,
      },
    };

    this.saveProfile(profile);
  },

  resetProfile(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};

// ── Convenience functions ──────────────────────────────────

/** Get or create the student profile */
export function getOrCreateProfile(): StudentProfile {
  return profileStore.getProfile() ?? emptyProfile();
}

/**
 * Record a skill attempt from a SkillUpdateSignal and persist.
 * Called by the chat UI after each AI message.
 */
export function recordAttempt(
  skillId: string,
  question: string,
  response: string,
  correct: boolean,
  aiNotes: string
): void {
  const profile = profileStore.getProfile() ?? emptyProfile();
  const existing = profile.skillRecords[skillId] ?? emptySkillRecord(skillId);

  const attempt: SkillAttempt = {
    timestamp: now(),
    questionAsked: question,
    studentResponse: response,
    correct,
    aiNotes,
  };

  const newStatus = deriveStatus(existing, correct);
  profileStore.updateSkillRecord(skillId, attempt, newStatus);
}

/** Returns the student's current status for a skill, or "unknown" */
export function getSkillStatus(skillId: string): SkillStatus {
  const profile = profileStore.getProfile();
  return profile?.skillRecords[skillId]?.status ?? "unknown";
}

/** Serialize profile into a compact string for injection into AI prompts */
export function serializeProfileForPrompt(profile: StudentProfile): string {
  const records = Object.values(profile.skillRecords).filter(
    (r) => r.status !== "unknown"
  );

  if (records.length === 0) {
    return "No skill history yet — this is the student's first session.";
  }

  return records
    .map((r) => {
      const pct =
        r.attempts > 0
          ? Math.round((r.correctAttempts / r.attempts) * 100)
          : 0;
      return `• ${r.skillId}: ${r.status} (${r.correctAttempts}/${r.attempts} correct, ${pct}%)`;
    })
    .join("\n");
}

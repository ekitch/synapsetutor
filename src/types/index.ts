// ============================================================
// SKILL GRAPH
// ============================================================

/** A node in the prerequisite skill graph */
export interface Skill {
  id: string;
  name: string;
  description: string;
  /** IDs of skills that must be mastered before this one */
  prerequisites: string[];
  domain: MathDomain;
  /** Rough difficulty 1–10 within its domain */
  difficulty: number;
  /** Example diagnostic question to ask at this skill level */
  exampleQuestion: string;
}

export type MathDomain =
  | "arithmetic"
  | "algebra"
  | "precalculus"
  | "calculus"
  | "statistics";

// ============================================================
// STUDENT SKILL PROFILE
// ============================================================

export type SkillStatus =
  | "unknown"      // never encountered
  | "introduced"   // seen but not yet tested
  | "struggling"   // tested, mostly wrong
  | "developing"   // mixed results
  | "mastered";    // consistently correct

export interface SkillAttempt {
  timestamp: string;           // ISO 8601
  questionAsked: string;
  studentResponse: string;
  correct: boolean;
  aiNotes: string;             // AI's reasoning about the attempt
}

export interface SkillRecord {
  skillId: string;
  status: SkillStatus;
  attempts: number;
  correctAttempts: number;
  lastTestedAt: string | null; // ISO 8601
  history: SkillAttempt[];
}

/** The full persistent student profile */
export interface StudentProfile {
  id: string;                                  // uuid, stored in localStorage
  createdAt: string;                           // ISO 8601
  skillRecords: Record<string, SkillRecord>;   // keyed by Skill.id
}

// ============================================================
// SESSION & CONVERSATION
// ============================================================

/** A single tutoring session around one problem/assignment */
export interface Session {
  id: string;
  studentId: string;
  originalProblem: string;          // what the student submitted
  targetSkillId: string;            // the skill the problem requires
  diagnosticSkillId: string;        // where the AI started probing
  startedAt: string;
  messages: Message[];
  questionNodes: QuestionNode[];
  unlockedQuestionCount: number;    // starts at 1, increments on effort
}

export type MessageRole = "student" | "tutor";

export interface Message {
  id: string;
  role: MessageRole;
  /** Raw content — may include LaTeX delimited by $...$ or $$...$$ */
  content: string;
  timestamp: string;
  /** Skills this message was probing or assessing */
  skillsAssessed: string[];         // Skill IDs
  /** For branch threads: parent message ID */
  parentMessageId: string | null;
  /** Human-readable label for what this branch dives into */
  branchLabel: string | null;
  /** AI's structured skill assessment emitted alongside this message */
  skillUpdate: SkillUpdateSignal | null;
}

/**
 * Structured signal the AI emits (as JSON in a hidden field)
 * so the client can update the skill log without a separate call.
 */
export interface SkillUpdateSignal {
  skillId: string;
  correct: boolean;
  notes: string;
}

// ============================================================
// QUESTION NODES (the unlocking mechanic)
// ============================================================

/**
 * Each QuestionNode is one rung in the diagnostic ladder.
 * Nodes are created by the AI and revealed one at a time.
 */
export interface QuestionNode {
  id: string;
  sessionId: string;
  skillId: string;
  difficulty: number;               // mirrors Skill.difficulty
  question: string;                 // LaTeX-aware
  /** null = not yet unlocked/visible to student */
  unlockedAt: string | null;
  answeredAt: string | null;
  correct: boolean | null;
  /** If wrong, the AI spawns a child node one level simpler */
  childNodeId: string | null;
  parentNodeId: string | null;
}

// ============================================================
// STORAGE ADAPTER INTERFACE
// (localStorage now; swap for DB later without changing callers)
// ============================================================

export interface ProfileStore {
  getProfile(): StudentProfile | null;
  saveProfile(profile: StudentProfile): void;
  updateSkillRecord(skillId: string, attempt: SkillAttempt, newStatus: SkillStatus): void;
  resetProfile(): void;
}

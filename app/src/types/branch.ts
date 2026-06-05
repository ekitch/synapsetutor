// ── Branch tree types ──────────────────────────────────────

export type BranchOrigin = "root" | "wrong-step" | "highlight";
export type BranchStatus = "open" | "active" | "resolved";

export interface BranchMessage {
  id: string;
  role: "user" | "tutor";
  /** Display text (signal stripped) */
  content: string;
  /** Raw text including signal (for API history) */
  rawContent: string;
  timestamp: string;
}

/**
 * One node in the branch tree.
 * Root node = the main problem.
 * Child nodes = drills spawned from wrong steps or highlights.
 */
export interface BranchNode {
  id: string;
  parentId: string | null;
  /** Human-readable label for the tree panel */
  label: string;
  /** The specific concept being drilled (null for root) */
  concept: string | null;
  origin: BranchOrigin;
  /** For wrong-step drills: the 0-based index of the wrong step */
  wrongStepIndex: number | null;
  /** The text of the wrong step or highlighted phrase */
  sourceText: string | null;
  messages: BranchMessage[];
  status: BranchStatus;
  /** IDs of child nodes */
  childIds: string[];
  /** Skill being assessed in this node */
  targetSkillId: string;
  /** When this node was created */
  createdAt: string;
}

/**
 * The full branch tree state for a session.
 */
export interface BranchTree {
  /** All nodes keyed by ID */
  nodes: Record<string, BranchNode>;
  /** ID of the root node (main problem) */
  rootId: string;
  /** ID of the currently active (3/4 width) node */
  activeNodeId: string;
}

// ── Helpers ────────────────────────────────────────────────

export function getAncestorPath(tree: BranchTree, nodeId: string): BranchNode[] {
  const path: BranchNode[] = [];
  let current = tree.nodes[nodeId];
  while (current?.parentId) {
    const parent = tree.nodes[current.parentId];
    if (parent) path.unshift(parent);
    current = parent;
  }
  return path;
}

export function getActiveNode(tree: BranchTree): BranchNode | null {
  return tree.nodes[tree.activeNodeId] ?? null;
}

export function buildMessageHistory(
  node: BranchNode
): { role: "user" | "assistant"; content: string }[] {
  return node.messages.map((m) => ({
    role: m.role === "tutor" ? ("assistant" as const) : ("user" as const),
    content: m.rawContent,
  }));
}

export function createRootNode(
  problem: string,
  targetSkillId: string
): BranchNode {
  return {
    id: crypto.randomUUID(),
    parentId: null,
    label: "Main problem",
    concept: null,
    origin: "root",
    wrongStepIndex: null,
    sourceText: problem,
    messages: [],
    status: "active",
    childIds: [],
    targetSkillId,
    createdAt: new Date().toISOString(),
  };
}

export function createDrillNode(
  parentId: string,
  label: string,
  concept: string,
  origin: BranchOrigin,
  sourceText: string,
  targetSkillId: string,
  wrongStepIndex?: number
): BranchNode {
  return {
    id: crypto.randomUUID(),
    parentId,
    label,
    concept,
    origin,
    wrongStepIndex: wrongStepIndex ?? null,
    sourceText,
    messages: [],
    status: "open",
    childIds: [],
    targetSkillId,
    createdAt: new Date().toISOString(),
  };
}

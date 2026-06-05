import { Skill } from "@/types";

/**
 * Math skill prerequisite graph.
 *
 * Each skill has:
 *   - a unique id (snake_case)
 *   - prerequisites: skills that must be mastered first
 *   - difficulty: 1–10 (absolute scale across all domains)
 *   - exampleQuestion: a sample diagnostic prompt (LaTeX via $...$)
 *
 * The AI uses this graph to:
 *   1. Identify the target skill for a given problem
 *   2. Walk prerequisites downward until it finds the student's floor
 *   3. Build back up rung by rung
 */
export const SKILLS: Skill[] = [
  // ── ARITHMETIC ────────────────────────────────────────────
  {
    id: "arithmetic_basic_ops",
    name: "Basic Arithmetic",
    description: "Addition, subtraction, multiplication, division of integers",
    prerequisites: [],
    domain: "arithmetic",
    difficulty: 1,
    exampleQuestion: "What is $7 \\times 8$?",
  },
  {
    id: "arithmetic_fractions",
    name: "Fractions",
    description: "Adding, subtracting, multiplying, and dividing fractions",
    prerequisites: ["arithmetic_basic_ops"],
    domain: "arithmetic",
    difficulty: 2,
    exampleQuestion: "Simplify $\\dfrac{3}{4} + \\dfrac{1}{6}$.",
  },
  {
    id: "arithmetic_exponents",
    name: "Exponents & Radicals",
    description: "Integer exponents, square roots, nth roots",
    prerequisites: ["arithmetic_basic_ops"],
    domain: "arithmetic",
    difficulty: 3,
    exampleQuestion: "Evaluate $2^5$ and $\\sqrt{81}$.",
  },
  {
    id: "arithmetic_order_of_ops",
    name: "Order of Operations",
    description: "PEMDAS / BODMAS applied to numeric expressions",
    prerequisites: ["arithmetic_basic_ops", "arithmetic_fractions"],
    domain: "arithmetic",
    difficulty: 2,
    exampleQuestion: "Evaluate $3 + 4 \\times (2^2 - 1)$.",
  },

  // ── ALGEBRA ───────────────────────────────────────────────
  {
    id: "algebra_variables",
    name: "Variables & Expressions",
    description: "Evaluating and simplifying algebraic expressions",
    prerequisites: ["arithmetic_basic_ops"],
    domain: "algebra",
    difficulty: 3,
    exampleQuestion: "If $x = 3$, what is $2x^2 - 5x + 1$?",
  },
  {
    id: "algebra_linear_equations",
    name: "Linear Equations",
    description: "Solving single-variable linear equations",
    prerequisites: ["algebra_variables"],
    domain: "algebra",
    difficulty: 4,
    exampleQuestion: "Solve for $x$: $3x - 7 = 14$.",
  },
  {
    id: "algebra_systems",
    name: "Systems of Equations",
    description: "Solving two-variable systems by substitution or elimination",
    prerequisites: ["algebra_linear_equations"],
    domain: "algebra",
    difficulty: 5,
    exampleQuestion:
      "Solve the system: $x + y = 5$ and $2x - y = 4$.",
  },
  {
    id: "algebra_polynomials",
    name: "Polynomials",
    description: "Adding, subtracting, multiplying polynomials; factoring",
    prerequisites: ["algebra_variables"],
    domain: "algebra",
    difficulty: 5,
    exampleQuestion: "Factor $x^2 - 5x + 6$.",
  },
  {
    id: "algebra_quadratics",
    name: "Quadratic Equations",
    description: "Solving by factoring, completing the square, quadratic formula",
    prerequisites: ["algebra_polynomials"],
    domain: "algebra",
    difficulty: 6,
    exampleQuestion:
      "Solve $x^2 - 3x - 10 = 0$ using the quadratic formula.",
  },
  {
    id: "algebra_functions",
    name: "Functions & Function Notation",
    description: "Domain, range, f(x) notation, composition",
    prerequisites: ["algebra_linear_equations"],
    domain: "algebra",
    difficulty: 5,
    exampleQuestion:
      "If $f(x) = 2x + 1$ and $g(x) = x^2$, find $(f \\circ g)(3)$.",
  },

  // ── PRECALCULUS ───────────────────────────────────────────
  {
    id: "precalc_trig_basics",
    name: "Trigonometry Basics",
    description: "Sin, cos, tan; unit circle; basic identities",
    prerequisites: ["algebra_functions", "arithmetic_exponents"],
    domain: "precalculus",
    difficulty: 6,
    exampleQuestion:
      "What is $\\sin\\!\\left(\\dfrac{\\pi}{6}\\right)$?",
  },
  {
    id: "precalc_limits_intuition",
    name: "Limits (Intuition)",
    description: "Informal notion of a limit; limit from tables and graphs",
    prerequisites: ["algebra_functions"],
    domain: "precalculus",
    difficulty: 6,
    exampleQuestion:
      "What does $\\displaystyle\\lim_{x \\to 2} (3x + 1)$ equal, and why?",
  },
  {
    id: "precalc_limits_formal",
    name: "Limit Laws & Algebraic Limits",
    description: "Sum/product/quotient limit laws; limits of polynomials and rational functions",
    prerequisites: ["precalc_limits_intuition", "algebra_polynomials"],
    domain: "precalculus",
    difficulty: 7,
    exampleQuestion:
      "Evaluate $\\displaystyle\\lim_{x \\to 3} \\frac{x^2 - 9}{x - 3}$.",
  },

  // ── CALCULUS ──────────────────────────────────────────────
  {
    id: "calc_derivative_concept",
    name: "Derivative as a Concept",
    description: "Derivative as instantaneous rate of change; limit definition",
    prerequisites: ["precalc_limits_formal"],
    domain: "calculus",
    difficulty: 7,
    exampleQuestion:
      "Using the limit definition, find the derivative of $f(x) = x^2$.",
  },
  {
    id: "calc_power_rule",
    name: "Power Rule",
    description: "$\\frac{d}{dx}[x^n] = nx^{n-1}$",
    prerequisites: ["calc_derivative_concept"],
    domain: "calculus",
    difficulty: 7,
    exampleQuestion: "Differentiate $f(x) = x^4$.",
  },
  {
    id: "calc_basic_rules",
    name: "Basic Derivative Rules",
    description: "Constant, sum, difference, constant-multiple rules",
    prerequisites: ["calc_power_rule"],
    domain: "calculus",
    difficulty: 7,
    exampleQuestion:
      "Find $f'(x)$ for $f(x) = 3x^3 - 5x^2 + 2x - 7$.",
  },
  {
    id: "calc_product_rule",
    name: "Product Rule",
    description: "$(uv)' = u'v + uv'$",
    prerequisites: ["calc_basic_rules"],
    domain: "calculus",
    difficulty: 8,
    exampleQuestion:
      "Differentiate $f(x) = x^2 \\cdot \\sin x$.",
  },
  {
    id: "calc_chain_rule",
    name: "Chain Rule",
    description: "$\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$",
    prerequisites: ["calc_basic_rules"],
    domain: "calculus",
    difficulty: 8,
    exampleQuestion:
      "Differentiate $f(x) = (3x^2 + 1)^5$.",
  },
  {
    id: "calc_quotient_rule",
    name: "Quotient Rule",
    description: "$\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$",
    prerequisites: ["calc_product_rule"],
    domain: "calculus",
    difficulty: 8,
    exampleQuestion:
      "Differentiate $f(x) = \\dfrac{x^2 + 1}{x - 3}$.",
  },
  {
    id: "calc_trig_derivatives",
    name: "Trig Derivatives",
    description: "Derivatives of sin, cos, tan and their reciprocals",
    prerequisites: ["calc_basic_rules", "precalc_trig_basics"],
    domain: "calculus",
    difficulty: 8,
    exampleQuestion:
      "Differentiate $f(x) = \\sin x + 3\\cos x$.",
  },
  {
    id: "calc_implicit_diff",
    name: "Implicit Differentiation",
    description: "Differentiating equations not solved for y",
    prerequisites: ["calc_chain_rule", "calc_product_rule"],
    domain: "calculus",
    difficulty: 9,
    exampleQuestion:
      "Find $\\dfrac{dy}{dx}$ given $x^2 + y^2 = 25$.",
  },
  {
    id: "calc_related_rates",
    name: "Related Rates",
    description: "Using implicit differentiation with respect to time",
    prerequisites: ["calc_implicit_diff"],
    domain: "calculus",
    difficulty: 9,
    exampleQuestion:
      "A ladder 10 ft long leans against a wall. If the bottom slides away at 2 ft/s, how fast is the top sliding down when the bottom is 6 ft from the wall?",
  },
  {
    id: "calc_integrals_concept",
    name: "Integrals (Concept & Antiderivatives)",
    description: "Indefinite integrals, antiderivative rules, +C",
    prerequisites: ["calc_basic_rules"],
    domain: "calculus",
    difficulty: 8,
    exampleQuestion:
      "Find $\\displaystyle\\int 3x^2 \\, dx$.",
  },
  {
    id: "calc_u_substitution",
    name: "U-Substitution",
    description: "Integration by substitution (reverse chain rule)",
    prerequisites: ["calc_integrals_concept", "calc_chain_rule"],
    domain: "calculus",
    difficulty: 9,
    exampleQuestion:
      "Evaluate $\\displaystyle\\int 2x(x^2 + 1)^4 \\, dx$.",
  },
];

/** Keyed lookup map for O(1) access */
export const SKILL_MAP: Record<string, Skill> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s])
);

/**
 * Returns all skills that are direct prerequisites of the given skill,
 * sorted by difficulty descending (closest floor first).
 */
export function getPrerequisites(skillId: string): Skill[] {
  const skill = SKILL_MAP[skillId];
  if (!skill) return [];
  return skill.prerequisites
    .map((id) => SKILL_MAP[id])
    .filter(Boolean)
    .sort((a, b) => b.difficulty - a.difficulty);
}

/**
 * Walks the prerequisite graph upward from a root skill,
 * returning an ordered diagnostic path from simplest → target.
 * Used to build the question ladder for a session.
 */
export function buildDiagnosticPath(targetSkillId: string): Skill[] {
  const visited = new Set<string>();
  const path: Skill[] = [];

  function walk(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const skill = SKILL_MAP[id];
    if (!skill) return;
    for (const prereqId of skill.prerequisites) {
      walk(prereqId);
    }
    path.push(skill);
  }

  walk(targetSkillId);
  return path; // topological order: prerequisites first
}

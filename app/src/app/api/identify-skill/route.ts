/**
 * POST /api/identify-skill
 *
 * Body: { problem: string }
 * Returns: { skillId: string, sessionTitle: string }
 *
 * Asks Claude to classify the student's problem into a skill ID and
 * generate a short human-readable session title in a single call.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildSkillAndTitlePrompt } from "@/lib/promptEngine";
import { SKILL_MAP } from "@/data/skillGraph";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { problem } = await req.json();

    if (!problem || typeof problem !== "string") {
      return NextResponse.json({ error: "problem is required" }, { status: 400 });
    }

    const prompt = buildSkillAndTitlePrompt(problem);

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();

    let skillId = "calc_power_rule";
    let sessionTitle = "Math Session";

    try {
      // Strip any markdown fences just in case
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned) as { skillId?: string; title?: string };
      if (parsed.skillId && SKILL_MAP[parsed.skillId]) skillId = parsed.skillId;
      if (parsed.title && typeof parsed.title === "string") sessionTitle = parsed.title;
    } catch {
      // Fallback: maybe the model returned just an ID (old format)
      if (SKILL_MAP[raw]) skillId = raw;
    }

    return NextResponse.json({ skillId, sessionTitle });
  } catch (err) {
    console.error("[identify-skill]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

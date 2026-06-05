/**
 * POST /api/chat
 *
 * Streaming chat endpoint. Each chunk is a Server-Sent Event.
 *
 * Body: {
 *   messages:      { role: "user" | "assistant", content: string }[]
 *   profile:       StudentProfile
 *   problem:       string   — original assignment/question
 *   targetSkillId: string   — identified skill for this session
 * }
 *
 * The last assistant message in the stream will include the
 * <!--SKILL_UPDATE:...--> signal, which the client parses and strips.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { buildSystemPrompt, ScaffoldState, defaultScaffoldState } from "@/lib/promptEngine";
import { buildDiagnosticPath } from "@/data/skillGraph";
import { getPastExamplesForSkills, buildPastExamplesBlock } from "@/lib/db";
import type { StudentProfile } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      profile,
      problem,
      targetSkillId,
      scaffold,
      studentId,
      systemPromptOverride,
    }: {
      messages: { role: "user" | "assistant"; content: string }[];
      profile: StudentProfile;
      problem: string;
      targetSkillId: string;
      scaffold?: ScaffoldState;
      studentId?: string;
      systemPromptOverride?: string;
    } = await req.json();

    let systemPrompt: string;

    if (systemPromptOverride) {
      // Branch sessions supply their own focused prompt
      systemPrompt = systemPromptOverride;
    } else {
      // Main session — build full prompt with past examples
      const skillPath = buildDiagnosticPath(targetSkillId);
      const skillIds = skillPath.map((s) => s.id);
      const pastExamples = studentId
        ? await getPastExamplesForSkills(studentId, skillIds)
        : {};
      const pastExamplesBlock = buildPastExamplesBlock(pastExamples);

      systemPrompt = buildSystemPrompt(
        profile,
        problem,
        targetSkillId,
        scaffold ?? defaultScaffoldState(),
        pastExamplesBlock
      );
    }

    // Claude requires at least one message — seed one if this is the session opener.
    // The content signals to the tutor to present the problem and ask for an attempt,
    // NOT to start asking diagnostic questions yet.
    const apiMessages = messages.length > 0
      ? messages
      : [{ role: "user" as const, content: "I need help with this problem. Can you show it to me and let me try first?" }];

    const stream = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
      stream: true,
    });

    // Pipe the stream as text/event-stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
          if (event.type === "message_stop") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[chat]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

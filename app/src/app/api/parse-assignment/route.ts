/**
 * POST /api/parse-assignment
 *
 * Accepts a PDF upload (multipart/form-data, field name "file").
 * Sends it to Claude as a document and returns a structured list of problems.
 *
 * Response: { problems: { index: number; text: string }[] }
 */

import Anthropic, { toFile } from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Convert to base64 for Claude's document API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const content: ContentBlockParam[] = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      } as ContentBlockParam,
      {
        type: "text",
        text: `Extract every distinct math problem from this assignment.

Return ONLY a JSON array — no explanation, no markdown, just the raw JSON.

Format:
[
  { "index": 1, "text": "full problem text exactly as written, including any context" },
  { "index": 2, "text": "..." }
]

Rules:
- Each numbered or lettered question is one problem
- Include all given information, constraints, and sub-parts in the text field
- Preserve all mathematical notation exactly (keep fractions, exponents, etc.)
- If the problem has parts (a), (b), (c), keep them as one problem entry
- Do not paraphrase or simplify
- Do not include instructions, headers, or non-problem content`,
      },
    ];

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let problems: { index: number; text: string }[];
    try {
      problems = JSON.parse(cleaned);
    } catch {
      console.error("[parse-assignment] JSON parse failed:", cleaned.slice(0, 200));
      return NextResponse.json({ error: "Failed to parse problems from PDF" }, { status: 500 });
    }

    return NextResponse.json({ problems });
  } catch (err) {
    console.error("[parse-assignment]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

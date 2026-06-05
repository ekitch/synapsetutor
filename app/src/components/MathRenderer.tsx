"use client";

/**
 * MathRenderer
 *
 * Renders a string that may contain:
 *   - LaTeX display math  $$...$$
 *   - LaTeX inline math   $...$
 *   - Markdown bold       **...**
 *   - Plain text          (newlines: \n\n+ collapses to single break, \n becomes <br>)
 */

import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  text: string;
  className?: string;
}

type Segment =
  | { type: "text";    content: string }
  | { type: "inline";  content: string }
  | { type: "display"; content: string }
  | { type: "bold";    content: string };

/**
 * Splits text into segments: display math, inline math, bold, and plain text.
 * Priority order: $$...$$ > $...$ > **...**
 */
function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];

  // Match $$...$$ (display), $...$ (inline), **...** (bold)
  const regex = /\$\$([\s\S]+?)\$\$|\$((?:[^$\\]|\\.)+?)\$|\*\*((?:[^*]|\*(?!\*))+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "display", content: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: "inline", content: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: "bold", content: match[3] });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false, trust: false });
  } catch {
    return `<span style="color:red">[math error]</span>`;
  }
}

/**
 * Renders a plain-text segment, collapsing multiple blank lines to a single
 * line-break while preserving intentional single newlines (e.g. question on own line).
 */
function TextSegment({ content, idx }: { content: string; idx: number }) {
  // Collapse 2+ newlines → single newline, then split for <br>
  const normalized = content.replace(/\n{2,}/g, "\n");
  const lines = normalized.split("\n");
  return (
    <>
      {lines.map((line, j) => (
        <React.Fragment key={`${idx}-${j}`}>
          {line}
          {j < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

export default function MathRenderer({ text, className }: Props) {
  const segments = parseSegments(text);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <TextSegment key={i} content={seg.content} idx={i} />;
        }
        if (seg.type === "bold") {
          // Recursively render bold content so it can contain inline math
          return (
            <strong key={i} style={{ fontWeight: 700 }}>
              <MathRenderer text={seg.content} />
            </strong>
          );
        }
        const html = renderKatex(seg.content, seg.type === "display");
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: html }}
            style={seg.type === "display" ? { display: "block", textAlign: "center", margin: "0.4rem 0" } : undefined}
          />
        );
      })}
    </span>
  );
}

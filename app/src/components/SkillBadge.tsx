"use client";

import type { SkillStatus } from "@/types";

const STATUS_STYLES: Record<SkillStatus, string> = {
  unknown:     "bg-gray-100 text-gray-400",
  introduced:  "bg-blue-100 text-blue-600",
  struggling:  "bg-red-100 text-red-600",
  developing:  "bg-yellow-100 text-yellow-700",
  mastered:    "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<SkillStatus, string> = {
  unknown:    "—",
  introduced: "Introduced",
  struggling: "Struggling",
  developing: "Developing",
  mastered:   "Mastered ✓",
};

interface Props {
  skillName: string;
  status: SkillStatus;
}

export default function SkillBadge({ skillName, status }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600 font-medium">{skillName}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status]}`}>
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}

"use client";

import { getEventVisual } from "@/lib/tagIcons";

interface SwipeEventVisualProps {
  tags: string[];
  title: string;
}

export function SwipeEventVisual({ tags, title }: SwipeEventVisualProps) {
  const visual = getEventVisual(tags);
  const [from, to] = visual.gradient;

  return (
    <div
      className="relative w-full h-36 rounded-t-2xl overflow-hidden flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {/* Centered icon */}
      <div className="absolute inset-0 flex items-center justify-center pb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.4}
          stroke={visual.iconColor}
          className="w-14 h-14 opacity-80"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={visual.iconPath}
          />
        </svg>
      </div>

      {/* Title scrim + text */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
        }}
      >
        <p className="text-white text-[15px] font-semibold leading-tight line-clamp-2">
          {title}
        </p>
      </div>
    </div>
  );
}

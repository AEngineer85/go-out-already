"use client";

import { getEventVisual } from "@/lib/tagIcons";

interface SwipeEventVisualProps {
  tags: string[];
  title: string;
  badge?: string;
}

export function SwipeEventVisual({ tags, title, badge }: SwipeEventVisualProps) {
  const visual = getEventVisual(tags);
  const [from, to] = visual.gradient;

  return (
    <div
      className="relative w-full h-3/5 overflow-hidden flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {/* Centered icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.2}
          stroke={visual.iconColor}
          className="w-24 h-24 opacity-20"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={visual.iconPath} />
        </svg>
      </div>

      {/* Bottom gradient scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

      {/* Badge chip — top left */}
      {badge && (
        <div className="absolute top-5 left-5 bg-tertiary text-on-tertiary px-4 py-1.5 rounded-full text-[11px] font-headline font-bold tracking-wide shadow-lg">
          {badge}
        </div>
      )}

      {/* Title overlaid at bottom of image */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
        <p className="text-white text-[17px] font-headline font-bold leading-snug line-clamp-2 text-balance">
          {title}
        </p>
      </div>
    </div>
  );
}

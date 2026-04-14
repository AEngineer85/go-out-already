"use client";

import { TagChip } from "@/components/TagChip";

interface TopPickCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    locationName: string;
    tags: string[];
    addedToCalendar: boolean;
  };
  onSelect: (id: string) => void;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TopPickCard({ event, onSelect }: TopPickCardProps) {
  return (
    <div
      className="bg-white rounded-[12px] p-[14px] cursor-pointer hover:shadow-sm transition-shadow"
      style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}
      onClick={() => !event.addedToCalendar && onSelect(event.id)}
    >
      <div className="text-[11px] font-medium text-[#185FA5] mb-1">
        {formatShortDate(event.date)}
      </div>

      <h3 className="text-[13px] font-medium text-[#111111] leading-snug mb-2">
        {event.title}
      </h3>

      <div className="flex items-center gap-1 mb-2">
        <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
          <path
            d="M5 0C2.79 0 1 1.79 1 4c0 3 4 8 4 8S9 7 9 4c0-2.21-1.79-4-4-4zm0 5.5A1.5 1.5 0 1 1 5 2.5a1.5 1.5 0 0 1 0 3z"
            fill="#999999"
          />
        </svg>
        <span className="text-[12px] text-[#555555] truncate">
          {event.locationName}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {event.tags.slice(0, 3).map((tag) => (
          <TagChip key={tag} tag={tag} />
        ))}
      </div>

      {event.addedToCalendar && (
        <div className="mt-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3B6D11] inline-block" />
          <span className="text-[11px] text-[#3B6D11] font-medium">
            Added to calendar
          </span>
        </div>
      )}
    </div>
  );
}

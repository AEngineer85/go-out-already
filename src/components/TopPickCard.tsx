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
  const datePart = dateStr.split("T")[0];
  const d = new Date(datePart + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TopPickCard({ event, onSelect }: TopPickCardProps) {
  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-4 cursor-pointer hover:bg-surface-container transition-all active:scale-[0.98] duration-200 border border-outline-variant/20 ${
        event.addedToCalendar ? "opacity-70" : ""
      }`}
      onClick={() => !event.addedToCalendar && onSelect(event.id)}
    >
      <div className="text-[10px] font-headline font-bold text-secondary uppercase tracking-widest mb-1.5">
        {formatShortDate(event.date)}
      </div>

      <h3 className="text-[13px] font-headline font-semibold text-on-surface leading-snug mb-2 line-clamp-2">
        {event.title}
      </h3>

      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="material-symbols-outlined text-on-surface-variant text-[14px]">location_on</span>
        <span className="text-[11px] text-on-surface-variant truncate">
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
          <span className="material-symbols-outlined text-[12px] text-[#3B6D11]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <span className="text-[10px] font-headline font-bold text-[#3B6D11]">
            Added to calendar
          </span>
        </div>
      )}
    </div>
  );
}

"use client";

import { TagChip } from "@/components/TagChip";

interface InterestedEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  locationName: string;
  address?: string | null;
  tags: string[];
  sourceName: string;
  additionalSources?: { sourceName: string }[] | null;
  addedToCalendar: boolean;
}

interface InterestedEventCardProps {
  event: InterestedEvent;
  selected: boolean;
  onToggle: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const datePart = dateStr.split("T")[0];
  const d = new Date(datePart + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function InterestedEventCard({
  event,
  selected,
  onToggle,
}: InterestedEventCardProps) {
  const startTime = formatTime(event.startTime);
  const endTime = formatTime(event.endTime);
  const timeStr = startTime
    ? endTime
      ? `${startTime} – ${endTime}`
      : startTime
    : "All day";

  const allSources = [
    event.sourceName,
    ...(event.additionalSources?.map((s) => s.sourceName) ?? []),
  ];

  return (
    <div
      className={`rounded-xl px-4 py-3.5 flex items-start gap-3 cursor-pointer transition-all active:scale-[0.99] duration-150 ${
        selected
          ? "bg-primary-container/40 border border-primary/40"
          : "bg-surface-container-lowest border border-outline-variant/20 hover:bg-surface-container"
      }`}
      onClick={() => onToggle(event.id)}
    >
      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
          selected
            ? "bg-primary border-primary"
            : "border-outline-variant"
        }`}
      >
        {selected && (
          <span className="material-symbols-outlined text-on-primary text-[14px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-headline font-semibold text-on-surface leading-tight">
          {event.title}
        </p>

        <div className="flex items-center gap-1.5 mt-1">
          <span className="material-symbols-outlined text-secondary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
          <span className="text-[12px] font-headline font-medium text-secondary">
            {formatDate(event.date)} · {timeStr}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="material-symbols-outlined text-on-surface-variant text-[14px]">location_on</span>
          <span className="text-[12px] text-on-surface-variant truncate">{event.locationName}</span>
        </div>

        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {event.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-on-surface-variant/60">
            {allSources.join(", ")}
          </span>
          {event.addedToCalendar && (
            <span className="flex items-center gap-1 text-[11px] font-headline font-bold text-[#3B6D11]">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Added
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

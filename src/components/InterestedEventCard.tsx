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
  const d = new Date(dateStr + "T12:00:00");
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

  const isPast = new Date(event.date + "T23:59:59") < new Date();

  return (
    <div
      className={`bg-white rounded-[10px] border px-4 py-3 flex items-start gap-3 cursor-pointer transition-all ${
        selected
          ? "border-[#2563EB] ring-1 ring-[#2563EB]"
          : "border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.2)]"
      } ${isPast ? "opacity-60" : ""}`}
      onClick={() => onToggle(event.id)}
    >
      {/* Checkbox */}
      <div
        className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
          selected
            ? "bg-[#2563EB] border-[#2563EB]"
            : "border-[rgba(0,0,0,0.25)]"
        }`}
      >
        {selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Title */}
        <p className="text-[13px] font-medium text-[#111111] leading-tight">
          {event.title}
        </p>

        {/* Date + time */}
        <p className="text-[12px] text-[#555555] mt-0.5">
          {formatDate(event.date)}
          {isPast && (
            <span className="ml-1.5 text-[11px] text-[#999999]">(past)</span>
          )}
          {" · "}
          {timeStr}
        </p>

        {/* Location */}
        <p className="text-[12px] text-[#555555] mt-0.5 truncate">
          {event.locationName}
        </p>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {event.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}

        {/* Source + calendar status */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-[#999999]">
            {allSources.join(", ")}
          </span>
          {event.addedToCalendar && (
            <span className="flex items-center gap-0.5 text-[11px] text-[#3B6D11] font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
              Added
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

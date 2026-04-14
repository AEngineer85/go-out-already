"use client";

import { TagChip } from "@/components/TagChip";

interface EventCardProps {
  event: {
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
  };
  selected: boolean;
  onToggle: (id: string) => void;
}

function formatDate(dateStr: string) {
  const datePart = dateStr.split("T")[0];
  const d = new Date(datePart + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time?: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function EventCard({ event, selected, onToggle }: EventCardProps) {
  const additionalSources = event.additionalSources as { sourceName: string }[] | null | undefined;
  const allSources = [
    event.sourceName,
    ...(additionalSources?.map((s) => s.sourceName) ?? []),
  ];

  const timeStr = formatTime(event.startTime);
  const endTimeStr = formatTime(event.endTime);
  const timeDisplay = timeStr
    ? endTimeStr
      ? `${timeStr} – ${endTimeStr}`
      : timeStr
    : "All day";

  return (
    <div
      className="bg-white rounded-[12px] p-[14px] cursor-pointer transition-all"
      style={{
        border: selected
          ? "0.5px solid #2563EB"
          : "0.5px solid rgba(0,0,0,0.12)",
        backgroundColor: selected ? "#F5F9FF" : "#FFFFFF",
      }}
      onClick={() => !event.addedToCalendar && onToggle(event.id)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox / Added badge */}
        <div className="mt-0.5 shrink-0">
          {event.addedToCalendar ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3B6D11] inline-block" />
            </div>
          ) : (
            <div
              className="w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center shrink-0"
              style={{
                backgroundColor: selected ? "#2563EB" : "transparent",
                borderColor: selected ? "#2563EB" : "rgba(0,0,0,0.25)",
              }}
            >
              {selected && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path
                    d="M1 4L4 7.5L10 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[14px] font-medium text-[#111111] leading-snug">
              {event.title}
            </h3>
          </div>

          <div className="mt-1 text-[12px] text-[#555555] flex flex-wrap gap-x-3 gap-y-0.5">
            <span>
              {formatDate(event.date)} · {timeDisplay}
            </span>
          </div>

          <div className="mt-0.5 text-[12px] text-[#555555] flex items-center gap-1">
            <svg
              width="11"
              height="13"
              viewBox="0 0 11 13"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M5.5 0C3.01 0 1 2.01 1 4.5c0 3.375 4.5 8.5 4.5 8.5S10 7.875 10 4.5C10 2.01 7.99 0 5.5 0zm0 6.125A1.625 1.625 0 1 1 5.5 2.875a1.625 1.625 0 0 1 0 3.25z"
                fill="#999999"
              />
            </svg>
            <span className="truncate">{event.locationName}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {event.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-[#999999]">
              {allSources.join(" · ")}
            </span>
            {event.addedToCalendar && (
              <span className="text-[11px] text-[#3B6D11] font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3B6D11] inline-block" />
                Added to calendar
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const d = new Date(datePart + "T12:00:00");
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
      className={`rounded-xl px-4 py-3.5 cursor-pointer transition-all active:scale-[0.99] duration-150 ${
        selected
          ? "bg-primary-container/40 border border-primary/40"
          : "bg-surface-container-lowest border border-outline-variant/20 hover:bg-surface-container"
      } ${event.addedToCalendar ? "opacity-70" : ""}`}
      onClick={() => !event.addedToCalendar && onToggle(event.id)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox / Added indicator */}
        <div className="mt-0.5 shrink-0">
          {event.addedToCalendar ? (
            <span className="material-symbols-outlined text-[18px] text-[#3B6D11]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          ) : (
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                selected
                  ? "bg-primary border-primary"
                  : "border-outline-variant"
              }`}
            >
              {selected && (
                <span className="material-symbols-outlined text-on-primary text-[14px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-headline font-semibold text-on-surface leading-snug">
            {event.title}
          </h3>

          <div className="mt-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
            <span className="text-[12px] font-headline font-medium text-secondary">
              {formatDate(event.date)} · {timeDisplay}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-on-surface-variant text-[14px]">location_on</span>
            <span className="text-[12px] text-on-surface-variant truncate">{event.locationName}</span>
          </div>

          {event.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {event.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant/60">
              {allSources.join(" · ")}
            </span>
            {event.addedToCalendar && (
              <span className="text-[11px] font-headline font-bold text-[#3B6D11]">
                Added to calendar
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  MotionValue,
} from "framer-motion";
import { SwipeEventVisual } from "./SwipeEventVisual";
import { SwipeLabel } from "./SwipeLabel";
import { TagChip } from "@/components/TagChip";

export interface SwipeEvent {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  locationName: string;
  address?: string | null;
  tags: string[];
  sourceName: string;
  sourceUrl: string;
  additionalSources?: { sourceName: string }[] | null;
  addedToCalendar: boolean;
  crawledAt: string;
}

export interface SwipeCardHandle {
  triggerSwipe: (direction: "right" | "left") => void;
  getDragX: () => MotionValue<number>;
}

interface SwipeCardProps {
  event: SwipeEvent;
  onSwipe: (direction: "right" | "left") => void;
  onCalendarAdd: (event: SwipeEvent) => void;
  isTop: boolean;
}

const SWIPE_THRESHOLD = 100; // px before triggering a swipe
const FLY_DISTANCE = 650;    // px to animate off screen

function formatDate(dateStr: string): string {
  // Strip any time component so we always parse a plain date at noon local time
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

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  function SwipeCard({ event, onSwipe, onCalendarAdd, isTop }, ref) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
    const interestedOpacity = useTransform(x, [20, 80], [0, 1]);
    const passOpacity = useTransform(x, [-80, -20], [1, 0]);

    const hasTriggered = useRef(false);

    function fire(direction: "right" | "left") {
      if (hasTriggered.current) return;
      hasTriggered.current = true;
      const target = direction === "right" ? FLY_DISTANCE : -FLY_DISTANCE;
      animate(x, target, {
        type: "spring",
        stiffness: 300,
        damping: 30,
        onComplete: () => onSwipe(direction),
      });
    }

    useImperativeHandle(ref, () => ({
      triggerSwipe: fire,
      getDragX: () => x,
    }));

    const startTime = formatTime(event.startTime);
    const endTime = formatTime(event.endTime);
    const timeStr = startTime
      ? endTime
        ? `${startTime} – ${endTime}`
        : startTime
      : "All day";

    return (
      <motion.div
        style={{ x, rotate, touchAction: "pan-y" }}
        drag={isTop ? "x" : false}
        dragSnapToOrigin={false}
        dragMomentum={false}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) {
            fire("right");
          } else if (info.offset.x < -SWIPE_THRESHOLD) {
            fire("left");
          } else {
            animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
          }
        }}
        className="absolute inset-0 bg-white rounded-2xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing select-none"
      >
        {/* Swipe direction labels */}
        <SwipeLabel type="interested" opacity={interestedOpacity} />
        <SwipeLabel type="pass" opacity={passOpacity} />

        {/* Gradient header */}
        <SwipeEventVisual tags={event.tags} title={event.title} />

        {/* Card body */}
        <div className="px-4 pt-3 pb-4 flex flex-col gap-2" style={{ overflowY: "hidden" }}>
          {/* Date / time */}
          <div className="flex items-center gap-1.5 text-[13px] text-[#555555]">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
            <span className="font-medium">{formatDate(event.date)}</span>
            <span className="text-[#999999]">·</span>
            <span>{timeStr}</span>
          </div>

          {/* Location */}
          <div className="flex items-start gap-1.5 text-[13px] text-[#555555]">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
            <span className="leading-tight">
              {event.locationName}
              {event.address && (
                <span className="text-[#999999] ml-1">· {event.address}</span>
              )}
            </span>
          </div>

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.tags.slice(0, 4).map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-[12px] text-[#555555] leading-relaxed line-clamp-3">
              {event.description}
            </p>
          )}

          {/* Footer: source + more info + calendar button */}
          <div className="flex items-center justify-between mt-1 pt-2 border-t border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#999999]">{event.sourceName}</span>
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 text-[11px] text-[#2563EB] font-medium hover:text-[#185FA5] transition-colors"
              >
                More info
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
            {event.addedToCalendar ? (
              <span className="flex items-center gap-1 text-[11px] text-[#3B6D11] font-medium">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
                Added to calendar
              </span>
            ) : (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onCalendarAdd(event);
                }}
                className="flex items-center gap-1 text-[11px] text-[#2563EB] font-medium hover:text-[#185FA5] transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
                  />
                </svg>
                Add to calendar
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

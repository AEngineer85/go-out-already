"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { cleanDescription } from "@/lib/cleanDescription";
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
  lat?: number | null;
  lng?: number | null;
  tags: string[];
  sourceName: string;
  sourceUrl: string;
  additionalSources?: { sourceName: string }[] | null;
  addedToCalendar: boolean;
  crawledAt: string;
  distanceMiles?: number | null;
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

const SWIPE_THRESHOLD = 100;
const FLY_DISTANCE = 650;

function formatDate(dateStr: string): string {
  const datePart = dateStr.split("T")[0];
  const d = new Date(datePart + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Decode HTML entities and strip any remaining tags from description text */

function formatTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Returns a contextual badge label based on event date */
function getEventBadge(dateStr: string, tags: string[]): string {
  const datePart = dateStr.split("T")[0];
  const eventDate = new Date(datePart + "T12:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "TONIGHT";
  if (diffDays === 1) return "TOMORROW";
  if (diffDays <= 7) {
    const dow = eventDate.getDay();
    if (dow === 6 || dow === 0) return "THIS WEEKEND";
    return "THIS WEEK";
  }
  // Fall back to first tag
  if (tags.length > 0) return tags[0].toUpperCase();
  return "UPCOMING";
}

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  function SwipeCard({ event, onSwipe, onCalendarAdd, isTop }, ref) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
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
      : null;

    const badge = getEventBadge(event.date, event.tags);

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
        className="absolute inset-0 bg-surface-container-lowest rounded-xl overflow-hidden swipe-card-shadow flex flex-col cursor-grab active:cursor-grabbing select-none border border-on-surface/5"
      >
        {/* Swipe direction labels */}
        <SwipeLabel type="interested" opacity={interestedOpacity} />
        <SwipeLabel type="pass" opacity={passOpacity} />

        {/* Image / Visual header — 60% of card */}
        <SwipeEventVisual tags={event.tags} title={event.title} badge={badge} />

        {/* Content area — 40% of card */}
        <div className="flex-grow px-5 py-4 flex flex-col justify-between overflow-hidden">
          <div className="space-y-2">
            {/* Date / time */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
              <span className="text-[11px] font-headline font-bold text-secondary uppercase tracking-widest">
                {formatDate(event.date)}{timeStr ? ` · ${timeStr}` : ""}
              </span>
            </div>

            {/* Tags */}
            {event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {event.tags.slice(0, 3).map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
              </div>
            )}

            {/* Description */}
            {event.description && (
              <p className="text-[12px] text-on-surface-variant leading-relaxed line-clamp-2">
                {cleanDescription(event.description)}
              </p>
            )}
          </div>

          {/* Footer: location + distance + actions */}
          <div className="flex items-center justify-between pt-3 border-t border-surface-container">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0">location_on</span>
              <span className="text-[12px] font-medium text-on-surface truncate">
                {event.locationName}
              </span>
              {event.distanceMiles != null && (
                <span className="text-[11px] font-headline font-bold text-primary flex-shrink-0">
                  · {event.distanceMiles} mi
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
              {event.addedToCalendar ? (
                <span className="flex items-center gap-1 text-[11px] text-[#3B6D11] font-headline font-bold">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Added
                </span>
              ) : (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onCalendarAdd(event); }}
                  className="flex items-center gap-0.5 text-[11px] text-primary font-headline font-bold hover:opacity-70 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Cal
                </button>
              )}
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 text-[11px] text-primary font-headline font-bold hover:opacity-70 transition-opacity"
              >
                INFO
                <span className="material-symbols-outlined text-[14px]">keyboard_arrow_right</span>
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

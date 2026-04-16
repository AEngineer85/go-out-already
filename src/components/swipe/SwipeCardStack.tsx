"use client";

import { AnimatePresence } from "framer-motion";
import { SwipeCard, SwipeCardHandle, SwipeEvent } from "./SwipeCard";

interface SwipeCardStackProps {
  events: SwipeEvent[];
  onSwipe: (direction: "right" | "left", event: SwipeEvent) => void;
  onCalendarAdd: (event: SwipeEvent) => void;
  cardRef: React.RefObject<SwipeCardHandle>;
}

export function SwipeCardStack({
  events,
  onSwipe,
  onCalendarAdd,
  cardRef,
}: SwipeCardStackProps) {
  const topThree = events.slice(0, 3);

  return (
    <div className="relative w-full h-full">
      {/* Back cards — stack effect */}
      {topThree
        .slice(1)
        .reverse()
        .map((event, reversedIdx) => {
          const stackIdx = topThree.length - 1 - reversedIdx; // 2 or 1
          const scale = stackIdx === 1 ? 0.95 : 0.90;
          const translateY = stackIdx === 1 ? 10 : 20;
          const opacity = stackIdx === 1 ? 0.6 : 0.35;

          return (
            <div
              key={event.id}
              className="absolute inset-0 bg-surface-container-low rounded-xl"
              style={{
                transform: `scale(${scale}) translateY(${translateY}px)`,
                transformOrigin: "bottom center",
                opacity,
              }}
            />
          );
        })}

      {/* Top card — interactive */}
      <AnimatePresence>
        {topThree[0] && (
          <SwipeCard
            key={topThree[0].id}
            ref={cardRef}
            event={topThree[0]}
            isTop={true}
            onSwipe={(direction) => onSwipe(direction, topThree[0])}
            onCalendarAdd={onCalendarAdd}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

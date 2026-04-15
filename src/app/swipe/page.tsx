"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { SwipeCardStack } from "@/components/swipe/SwipeCardStack";
import { SwipeControls } from "@/components/swipe/SwipeControls";
import { EmptySwipeState } from "@/components/swipe/EmptySwipeState";
import { AddToCalendarModal } from "@/components/AddToCalendarModal";
import { SwipeCardHandle, SwipeEvent } from "@/components/swipe/SwipeCard";

interface LastSwipe {
  swipeId: string;
  direction: "right" | "left";
  event: SwipeEvent;
}

export default function SwipePage() {
  const { status } = useSession();
  const router = useRouter();

  const [queue, setQueue] = useState<SwipeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [prefetching, setPrefetching] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Calendar modal state
  const [calendarEvent, setCalendarEvent] = useState<SwipeEvent | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(1440);

  const cardRef = useRef<SwipeCardHandle>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Load user preferences for calendar
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.defaultReminderMinutes) {
          setDefaultReminderMinutes(d.defaultReminderMinutes);
        }
      })
      .catch(() => {});
  }, [status]);

  // Initial queue load
  useEffect(() => {
    if (status !== "authenticated") return;
    loadQueue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function loadQueue() {
    setLoading(true);
    setQueueError(null);
    try {
      const res = await fetch("/api/swipe/queue?limit=20");
      const data = await res.json();
      if (!res.ok) {
        setQueueError(`API error ${res.status}: ${data.error ?? JSON.stringify(data)}`);
        setQueue([]);
      } else {
        setQueue(data.events ?? []);
      }
    } catch (e) {
      setQueueError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }

  // Prefetch more cards when running low
  const prefetchMore = useCallback(async () => {
    if (prefetching || queue.length > 5) return;
    setPrefetching(true);
    try {
      const res = await fetch("/api/swipe/queue?limit=20");
      const data = await res.json();
      if (data.events?.length > 0) {
        setQueue((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const newEvents = (data.events as SwipeEvent[]).filter(
            (e) => !existingIds.has(e.id)
          );
          return [...prev, ...newEvents];
        });
      }
    } catch {
      // silent
    } finally {
      setPrefetching(false);
    }
  }, [prefetching, queue.length]);

  useEffect(() => {
    if (queue.length <= 5 && queue.length > 0) {
      prefetchMore();
    }
  }, [queue.length, prefetchMore]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  async function handleSwipe(direction: "right" | "left", event: SwipeEvent) {
    setSwiping(true);
    // Optimistically remove from queue
    setQueue((prev) => prev.filter((e) => e.id !== event.id));
    setReviewedCount((c) => c + 1);

    try {
      const res = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, direction }),
      });
      const data = await res.json();

      setLastSwipe({
        swipeId: data.swipeId,
        direction,
        event,
      });

      showToast(direction === "right" ? "Saved! 💚" : "Passed");
    } catch {
      showToast("Something went wrong");
    } finally {
      setSwiping(false);
    }
  }

  async function handleUndo() {
    if (!lastSwipe) return;
    setSwiping(true);
    try {
      await fetch(`/api/swipe/${lastSwipe.swipeId}`, { method: "DELETE" });
      // Put the card back at the top of the queue
      setQueue((prev) => [lastSwipe.event, ...prev]);
      setReviewedCount((c) => Math.max(0, c - 1));
      setLastSwipe(null);
      showToast("Undone");
    } catch {
      showToast("Couldn't undo");
    } finally {
      setSwiping(false);
    }
  }

  function handlePass() {
    cardRef.current?.triggerSwipe("left");
  }

  function handleInterested() {
    cardRef.current?.triggerSwipe("right");
  }

  async function handleCalendarConfirm(reminderMinutes: number) {
    if (!calendarEvent) return;
    setCalendarLoading(true);
    try {
      await fetch("/api/calendar/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventIds: [calendarEvent.id],
          reminderMinutes,
        }),
      });
      // Update the event in queue if it's still there
      setQueue((prev) =>
        prev.map((e) =>
          e.id === calendarEvent.id ? { ...e, addedToCalendar: true } : e
        )
      );
      showToast("Added to calendar!");
    } catch {
      showToast("Failed to add to calendar");
    } finally {
      setCalendarLoading(false);
      setCalendarEvent(null);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen" style={{ background: "#F8F8F6" }}>
        <NavBar />
        <div className="flex items-center justify-center pt-24">
          <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8F8F6" }}>
      <NavBar />

      <main className="max-w-sm mx-auto px-4 pt-6 pb-10">
        {/* Header */}
        <div className="mb-5 text-center">
          <h1 className="text-[17px] font-semibold text-[#111111]">
            What&apos;s worth going to?
          </h1>
          <p className="text-[12px] text-[#999999] mt-0.5">
            Swipe right to save · left to skip
          </p>
        </div>

        {queueError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[12px] text-red-700 font-mono break-all">
            <p className="font-semibold mb-1">Could not load events:</p>
            <p>{queueError}</p>
          </div>
        ) : queue.length === 0 ? (
          <EmptySwipeState reviewedCount={reviewedCount} />
        ) : (
          <>
            <SwipeCardStack
              events={queue}
              onSwipe={handleSwipe}
              onCalendarAdd={setCalendarEvent}
              cardRef={cardRef}
            />
            <SwipeControls
              onPass={handlePass}
              onInterested={handleInterested}
              onUndo={handleUndo}
              canUndo={!!lastSwipe}
              disabled={swiping || queue.length === 0}
            />
          </>
        )}

        {/* Queue count */}
        {queue.length > 0 && (
          <p className="text-center text-[11px] text-[#999999] mt-4">
            {queue.length} event{queue.length !== 1 ? "s" : ""} to review
          </p>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111111] text-white text-[13px] font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Calendar modal */}
      {calendarEvent && (
        <AddToCalendarModal
          events={[
            {
              id: calendarEvent.id,
              title: calendarEvent.title,
              date: calendarEvent.date,
            },
          ]}
          defaultReminderMinutes={defaultReminderMinutes}
          onConfirm={handleCalendarConfirm}
          onClose={() => setCalendarEvent(null)}
          loading={calendarLoading}
        />
      )}
    </div>
  );
}

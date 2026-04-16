"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const { data: session, status } = useSession();
  const router = useRouter();

  const [queue, setQueue] = useState<SwipeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [prefetching, setPrefetching] = useState(false);
  const [queueError, setQueueError] = useState(false);

  const [calendarEvent, setCalendarEvent] = useState<SwipeEvent | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(1440);
  const [unswipedCount, setUnswipedCount] = useState<number | null>(null);

  const cardRef = useRef<SwipeCardHandle>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((d) => { if (d.defaultReminderMinutes) setDefaultReminderMinutes(d.defaultReminderMinutes); })
      .catch(() => {});
    fetch("/api/swipe/stats")
      .then((r) => r.json())
      .then((d) => { if (typeof d.unswipedCount === "number") setUnswipedCount(d.unswipedCount); })
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadQueue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function loadQueue() {
    setLoading(true);
    setQueueError(false);
    try {
      const res = await fetch("/api/swipe/queue?limit=20");
      const data = await res.json();
      if (!res.ok) { setQueueError(true); setQueue([]); }
      else setQueue(data.events ?? []);
    } catch {
      setQueueError(true);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }

  const prefetchMore = useCallback(async () => {
    if (prefetching || queue.length > 5) return;
    setPrefetching(true);
    try {
      const res = await fetch("/api/swipe/queue?limit=20");
      const data = await res.json();
      if (data.events?.length > 0) {
        setQueue((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          return [...prev, ...(data.events as SwipeEvent[]).filter((e) => !existingIds.has(e.id))];
        });
      }
    } catch { /* silent */ }
    finally { setPrefetching(false); }
  }, [prefetching, queue.length]);

  useEffect(() => {
    if (queue.length <= 5 && queue.length > 0) prefetchMore();
  }, [queue.length, prefetchMore]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  async function handleSwipe(direction: "right" | "left", event: SwipeEvent) {
    setSwiping(true);
    setQueue((prev) => prev.filter((e) => e.id !== event.id));
    setReviewedCount((c) => c + 1);
    setUnswipedCount((c) => (c !== null ? Math.max(0, c - 1) : null));
    try {
      const res = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, direction }),
      });
      const data = await res.json();
      setLastSwipe({ swipeId: data.swipeId, direction, event });
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
      setQueue((prev) => [lastSwipe.event, ...prev]);
      setReviewedCount((c) => Math.max(0, c - 1));
      setUnswipedCount((c) => (c !== null ? c + 1 : null));
      setLastSwipe(null);
      showToast("Undone");
    } catch {
      showToast("Couldn't undo");
    } finally {
      setSwiping(false);
    }
  }

  const initials = session?.user?.name
    ?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased overflow-x-hidden">

      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex-shrink-0">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[13px] font-bold text-primary bg-primary-container/30">
                {initials}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">
            go out already
          </h1>
        </div>
        <Link href="/" className="hover:opacity-70 transition-opacity active:scale-95 duration-200">
          <span className="material-symbols-outlined text-2xl text-on-surface-variant">apps</span>
        </Link>
      </header>

      {/* Main canvas */}
      <main className="min-h-screen pt-24 pb-36 px-5 flex flex-col items-center justify-center max-w-md mx-auto">

        {queueError ? (
          <div className="text-center py-12 w-full">
            <p className="text-[15px] font-headline font-semibold text-on-surface mb-2">Couldn&apos;t load events</p>
            <p className="text-[13px] text-on-surface-variant mb-6">Check your connection and try again.</p>
            <button
              onClick={loadQueue}
              className="px-6 py-2.5 rounded-full bg-primary text-on-primary text-[13px] font-headline font-bold hover:bg-primary-dim transition-colors"
            >
              Retry
            </button>
          </div>
        ) : queue.length === 0 ? (
          <EmptySwipeState reviewedCount={reviewedCount} />
        ) : (
          <>
            {/* Card stack */}
            <div className="relative w-full" style={{ height: 460 }}>
              {/* Ghost card depth layer */}
              <div className="absolute inset-x-2 bottom-0 h-full translate-y-3 scale-[0.95] opacity-40 bg-surface-container-low rounded-xl -z-10" />
              <div className="absolute inset-x-4 bottom-0 h-full translate-y-6 scale-[0.90] opacity-20 bg-surface-container-low rounded-xl -z-20" />

              <SwipeCardStack
                events={queue}
                onSwipe={handleSwipe}
                onCalendarAdd={setCalendarEvent}
                cardRef={cardRef}
              />
            </div>

            {/* Controls — separate row below card, clear of overlap */}
            <div className="mt-6 w-full">
              <SwipeControls
                onPass={() => cardRef.current?.triggerSwipe("left")}
                onInterested={() => cardRef.current?.triggerSwipe("right")}
                onUndo={handleUndo}
                canUndo={!!lastSwipe}
                disabled={swiping || queue.length === 0}
              />
            </div>

            {/* Editorial teaser */}
            <div className="mt-14 text-center space-y-2 opacity-40">
              <p className="font-headline font-bold text-[10px] tracking-[0.3em] text-on-surface-variant uppercase">
                Swipe to discover more in Columbus
              </p>
              <div className="w-0.5 h-8 bg-gradient-to-b from-on-surface-variant to-transparent mx-auto rounded-full" />
            </div>

            {/* Queue count */}
            {unswipedCount !== null && (
              <p className="mt-3 text-center text-[11px] text-on-surface-variant/60">
                {unswipedCount} event{unswipedCount !== 1 ? "s" : ""} to review
              </p>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-6 pb-8 pt-4 bg-surface/90 backdrop-blur-2xl z-50 rounded-t-xl shadow-[0_-4px_40px_rgba(0,0,0,0.05)] font-headline text-xs font-medium">
        <button className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-full px-5 py-2 active:scale-90 duration-300 gap-0.5">
          <span className="material-symbols-outlined text-[22px]">explore</span>
          <span>Discover</span>
        </button>
        <Link href="/" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-90 duration-300 px-3 gap-0.5">
          <span className="material-symbols-outlined text-[22px]">calendar_today</span>
          <span>Browse</span>
        </Link>
        <Link href="/interested" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-90 duration-300 px-3 gap-0.5">
          <span className="material-symbols-outlined text-[22px]">bookmark</span>
          <span>Saved</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-90 duration-300 px-3 gap-0.5">
          <span className="material-symbols-outlined text-[22px]">person</span>
          <span>Me</span>
        </Link>
      </nav>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[13px] font-headline font-medium px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-50">
          {toast}
        </div>
      )}

      {/* Calendar modal */}
      {calendarEvent && (
        <AddToCalendarModal
          events={[{ id: calendarEvent.id, title: calendarEvent.title, date: calendarEvent.date }]}
          defaultReminderMinutes={defaultReminderMinutes}
          onConfirm={async (reminderMinutes) => {
            if (!calendarEvent) return;
            setCalendarLoading(true);
            try {
              await fetch("/api/calendar/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventIds: [calendarEvent.id], reminderMinutes }),
              });
              setQueue((prev) => prev.map((e) => e.id === calendarEvent.id ? { ...e, addedToCalendar: true } : e));
              showToast("Added to calendar!");
            } catch {
              showToast("Failed to add to calendar");
            } finally {
              setCalendarLoading(false);
              setCalendarEvent(null);
            }
          }}
          onClose={() => setCalendarEvent(null)}
          loading={calendarLoading}
        />
      )}
    </div>
  );
}

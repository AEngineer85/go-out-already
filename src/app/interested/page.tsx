"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InterestedEventCard } from "@/components/InterestedEventCard";
import { AddToCalendarModal } from "@/components/AddToCalendarModal";

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
  crawledAt: string;
}

export default function InterestedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [events, setEvents] = useState<InterestedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(1440);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    Promise.all([
      fetch("/api/swipe/interested").then((r) => r.json()),
      fetch("/api/user/preferences").then((r) => r.json()),
    ])
      .then(([interestData, prefData]) => {
        setEvents(interestData.events ?? []);
        if (prefData.defaultReminderMinutes) {
          setDefaultReminderMinutes(prefData.defaultReminderMinutes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    const notAdded = events.filter((e) => !e.addedToCalendar).map((e) => e.id);
    setSelectedIds(new Set(notAdded));
  }

  async function handleCalendarConfirm(reminderMinutes: number) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setCalendarLoading(true);
    try {
      await fetch("/api/calendar/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventIds: ids, reminderMinutes }),
      });
      setEvents((prev) =>
        prev.map((e) =>
          ids.includes(e.id) ? { ...e, addedToCalendar: true } : e
        )
      );
      setSelectedIds(new Set());
      showToast(`Added ${ids.length} event${ids.length !== 1 ? "s" : ""} to calendar!`);
    } catch {
      showToast("Failed to add to calendar");
    } finally {
      setCalendarLoading(false);
      setShowModal(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  const selectedForModal = events
    .filter((e) => selectedIds.has(e.id))
    .map((e) => ({ id: e.id, title: e.title, date: e.date }));

  const initials = session?.user?.name
    ?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased pb-36">

      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-6 py-4">
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

      <main className="pt-24 px-5 max-w-2xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[22px] font-headline font-bold text-on-surface">Saved Events</h2>
            {events.length > 0 && (
              <p className="text-[13px] text-on-surface-variant mt-0.5">
                {events.length} upcoming event{events.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-on-primary text-[13px] font-headline font-bold hover:opacity-90 transition-opacity active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
              Add {selectedIds.size}
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 gap-5">
            <div className="w-20 h-20 rounded-full bg-primary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
            </div>
            <div className="space-y-1">
              <p className="text-[18px] font-headline font-bold text-on-surface">Nothing saved yet</p>
              <p className="text-[14px] text-on-surface-variant">
                Swipe right on events you want to attend.
              </p>
            </div>
            <Link
              href="/swipe"
              className="flex items-center gap-1.5 px-6 py-3 rounded-full bg-primary text-on-primary text-[14px] font-headline font-bold hover:opacity-90 transition-opacity active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-[18px]">explore</span>
              Open Swipe mode
            </Link>
          </div>
        ) : (
          <>
            {/* Select all */}
            {events.some((e) => !e.addedToCalendar) && (
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={selectAll}
                  className="text-[12px] font-headline font-bold text-primary hover:opacity-70 transition-opacity"
                >
                  Select all not yet added
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[12px] font-headline text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {events.map((event) => (
                <InterestedEventCard
                  key={event.id}
                  event={event}
                  selected={selectedIds.has(event.id)}
                  onToggle={toggleSelect}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-6 pb-8 pt-4 bg-surface/90 backdrop-blur-2xl z-50 rounded-t-xl shadow-[0_-4px_40px_rgba(0,0,0,0.05)] font-headline text-xs font-medium">
        <Link href="/swipe" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-90 duration-300 px-3 gap-0.5">
          <span className="material-symbols-outlined text-[22px]">explore</span>
          <span>Discover</span>
        </Link>
        <Link href="/" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-90 duration-300 px-3 gap-0.5">
          <span className="material-symbols-outlined text-[22px]">calendar_today</span>
          <span>Browse</span>
        </Link>
        <button className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-full px-5 py-2 active:scale-90 duration-300 gap-0.5">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
          <span>Saved</span>
        </button>
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
      {showModal && (
        <AddToCalendarModal
          events={selectedForModal}
          defaultReminderMinutes={defaultReminderMinutes}
          onConfirm={handleCalendarConfirm}
          onClose={() => setShowModal(false)}
          loading={calendarLoading}
        />
      )}
    </div>
  );
}

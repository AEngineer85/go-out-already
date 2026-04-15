"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
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
  const { status } = useSession();
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

      <main
        className="max-w-2xl mx-auto px-4 pt-6 pb-10"
        style={{ maxWidth: 680 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[18px] font-semibold text-[#111111]">
              Saved Events
            </h1>
            {events.length > 0 && (
              <p className="text-[12px] text-[#999999] mt-0.5">
                {events.length} event{events.length !== 1 ? "s" : ""} saved
              </p>
            )}
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[13px] font-medium hover:bg-[#185FA5] transition-colors"
            >
              Add {selectedIds.size} to Calendar
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#E6F1FB] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[#2563EB]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-medium text-[#111111]">
                Nothing saved yet
              </p>
              <p className="text-[13px] text-[#555555] mt-1">
                Try Swipe mode to discover events you love.
              </p>
            </div>
            <a
              href="/swipe"
              className="px-5 py-2.5 rounded-lg bg-[#2563EB] text-white text-[13px] font-medium hover:bg-[#185FA5] transition-colors"
            >
              Open Swipe mode →
            </a>
          </div>
        ) : (
          <>
            {/* Select all (for non-added events) */}
            {events.some((e) => !e.addedToCalendar) && (
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={selectAll}
                  className="text-[12px] text-[#2563EB] hover:text-[#185FA5]"
                >
                  Select all not yet added
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[12px] text-[#999999] hover:text-[#555555]"
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111111] text-white text-[13px] font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none z-50">
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

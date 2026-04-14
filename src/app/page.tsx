"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { NavBar } from "@/components/NavBar";
import { TopPickCard } from "@/components/TopPickCard";
import { EventCard } from "@/components/EventCard";
import { FilterBar } from "@/components/FilterBar";
import { AddToCalendarModal } from "@/components/AddToCalendarModal";

interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string;
  address: string | null;
  tags: string[];
  sourceName: string;
  additionalSources: { sourceName: string }[] | null;
  addedToCalendar: boolean;
  crawledAt: string;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function sixMonthsStr() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split("T")[0];
}

export default function HomePage() {
  const { status } = useSession();

  const [topPicks, setTopPicks] = useState<Event[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [defaultReminder, setDefaultReminder] = useState(1440);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const [hideAdded, setHideAdded] = useState(false);
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(sixMonthsStr());

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTopPicks = useCallback(async () => {
    const res = await fetch("/api/events/top-picks");
    if (res.ok) {
      const data = await res.json();
      setTopPicks(data.events);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams();
    selectedTags.forEach((t) => params.append("tags", t));
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (recentlyAdded) params.set("recentlyAdded", "true");
    if (hideAdded) params.set("hideAdded", "true");

    const res = await fetch(`/api/events?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
      setNewCount(data.newCount);
    }
  }, [selectedTags, dateFrom, dateTo, recentlyAdded, hideAdded]);

  useEffect(() => {
    if (status === "authenticated") {
      setLoading(true);
      Promise.all([
        fetchTopPicks(),
        fetchEvents(),
        fetch("/api/user/preferences")
          .then((r) => r.json())
          .then((d) => d?.defaultReminderMinutes && setDefaultReminder(d.defaultReminderMinutes)),
      ]).finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, fetchTopPicks, fetchEvents]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleEventToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleTopPickSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleAddToCalendar = async (reminderMinutes: number) => {
    setAddingToCalendar(true);
    try {
      const res = await fetch("/api/calendar/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventIds: Array.from(selectedIds),
          reminderMinutes,
        }),
      });
      const data = await res.json();
      const succeeded = data.results?.filter((r: { success: boolean }) => r.success).length ?? 0;
      setShowModal(false);
      setSelectedIds(new Set());
      showToast(`Added ${succeeded} event${succeeded !== 1 ? "s" : ""} to Google Calendar`);
      await Promise.all([fetchTopPicks(), fetchEvents()]);
    } catch {
      showToast("Failed to add events. Please try again.");
    } finally {
      setAddingToCalendar(false);
    }
  };

  const selectedEvents = [...topPicks, ...events].filter(
    (e, i, arr) =>
      selectedIds.has(e.id) && arr.findIndex((x) => x.id === e.id) === i
  );

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#F8F8F6]">
        <NavBar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <h1 className="text-[24px] font-medium text-[#111111] mb-2">
            go out already
          </h1>
          <p className="text-[15px] text-[#555555] mb-8">
            Central Ohio events, all in one place.
          </p>
          <button
            onClick={() => signIn("google")}
            className="px-6 py-3 bg-[#2563EB] text-white rounded-[12px] text-[15px] font-medium hover:bg-[#185FA5] transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <NavBar />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[14px] text-[#999]">Loading events...</div>
          </div>
        ) : (
          <>
            {/* Top Picks */}
            {topPicks.length > 0 && (
              <section className="mb-6">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-[15px] font-medium text-[#111111]">
                    Top picks this week
                  </h2>
                  <span className="text-[11px] text-[#999999]">
                    Scored by popularity &amp; source quality
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[10px] overflow-x-auto">
                  {topPicks.map((event) => (
                    <TopPickCard
                      key={event.id}
                      event={event}
                      onSelect={handleTopPickSelect}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Events */}
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-medium text-[#111111]">
                  All upcoming events
                  {newCount > 0 && (
                    <span className="ml-2 text-[11px] font-medium text-white bg-[#2563EB] px-2 py-0.5 rounded-full">
                      {newCount} new
                    </span>
                  )}
                </h2>
                <span className="text-[11px] text-[#999999]">
                  Central Ohio, 25 mi
                </span>
              </div>

              <div className="mb-3">
                <FilterBar
                  selectedTags={selectedTags}
                  onTagToggle={handleTagToggle}
                  recentlyAdded={recentlyAdded}
                  onRecentlyAddedToggle={() => setRecentlyAdded((v) => !v)}
                  hideAdded={hideAdded}
                  onHideAddedToggle={() => setHideAdded((v) => !v)}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onDateFromChange={setDateFrom}
                  onDateToChange={setDateTo}
                />
              </div>

              {events.length === 0 ? (
                <div className="text-center py-12 text-[14px] text-[#999]">
                  No events found. Try adjusting your filters.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      selected={selectedIds.has(event.id)}
                      onToggle={handleEventToggle}
                    />
                  ))}
                </div>
              )}

              {/* Action bar */}
              {selectedIds.size > 0 && (
                <div
                  className="mt-4 rounded-[12px] p-4 flex items-center justify-between"
                  style={{ backgroundColor: "#2563EB" }}
                >
                  <div>
                    <span className="text-white text-[15px] font-medium">
                      {selectedIds.size} event{selectedIds.size !== 1 ? "s" : ""} selected
                    </span>
                    <div className="text-[12px] text-white/70">
                      Ready to add to your calendar
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-white text-[#2563EB] px-4 py-2 rounded-[8px] text-[13px] font-medium hover:bg-blue-50 transition-colors"
                  >
                    Add to Calendar
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <AddToCalendarModal
          events={selectedEvents}
          defaultReminderMinutes={defaultReminder}
          onConfirm={handleAddToCalendar}
          onClose={() => setShowModal(false)}
          loading={addingToCalendar}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111111] text-white text-[13px] px-4 py-2.5 rounded-[10px] shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

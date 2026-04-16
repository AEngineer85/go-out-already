"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { TopPickCard } from "@/components/TopPickCard";
import { EventCard } from "@/components/EventCard";
import { FilterBar } from "@/components/FilterBar";
import { AddToCalendarModal } from "@/components/AddToCalendarModal";
import Link from "next/link";

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
  const [hideArchived, setHideArchived] = useState(false);
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
    if (hideArchived) params.set("hideArchived", "true");

    const res = await fetch(`/api/events?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
      setNewCount(data.newCount);
    }
  }, [selectedTags, dateFrom, dateTo, recentlyAdded, hideAdded, hideArchived]);

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
      <div className="min-h-screen bg-surface font-body text-on-surface antialiased">
        {/* Minimal header for unauthenticated */}
        <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl px-6 py-4">
          <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">go out already</h1>
        </header>
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6 pt-16">
          {/* Hero */}
          <div className="space-y-3 max-w-sm">
            <h1 className="text-5xl font-headline font-extrabold text-primary tracking-tight leading-none">
              go out<br />already.
            </h1>
            <p className="text-[16px] text-on-surface-variant font-body leading-relaxed">
              Central Ohio events, curated and ready to swipe.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 max-w-xs">
            {["Sports", "Music", "Food", "Arts", "Outdoors"].map((f) => (
              <span key={f} className="px-4 py-1.5 bg-surface-container rounded-full text-[12px] font-headline font-bold text-on-surface-variant">
                {f}
              </span>
            ))}
          </div>

          <button
            onClick={() => signIn("google")}
            className="flex items-center gap-3 px-6 py-3.5 bg-primary text-on-primary rounded-full text-[15px] font-headline font-bold hover:opacity-90 transition-opacity active:scale-95 duration-200 shadow-lg shadow-primary/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <p className="text-[11px] text-on-surface-variant/50 font-body max-w-xs">
            Free to use · Your data stays private
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased pb-36">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">go out already</h1>
        <Link href="/settings" className="hover:opacity-70 transition-opacity active:scale-95 duration-200">
          <span className="material-symbols-outlined text-2xl text-on-surface-variant">apps</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-24 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Swipe CTA banner */}
            <div className="mb-6 rounded-xl bg-primary px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-headline font-bold text-on-primary/70 uppercase tracking-widest">
                  Discover mode
                </p>
                <p className="text-[16px] font-headline font-bold text-on-primary mt-0.5">
                  Swipe to find your next event
                </p>
              </div>
              <Link
                href="/swipe"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-on-primary text-primary text-[13px] font-headline font-bold hover:opacity-90 transition-opacity active:scale-95 duration-200 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">explore</span>
                Open
              </Link>
            </div>

            {/* Top Picks */}
            {topPicks.length > 0 && (
              <section className="mb-6">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-[17px] font-headline font-bold text-on-surface">
                    Top picks this week
                  </h2>
                  <span className="text-[11px] font-headline text-on-surface-variant">
                    by relevance
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
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
                <h2 className="text-[17px] font-headline font-bold text-on-surface">
                  All upcoming events
                  {newCount > 0 && (
                    <span className="ml-2 text-[11px] font-headline font-bold text-on-primary bg-primary px-2 py-0.5 rounded-full">
                      {newCount} new
                    </span>
                  )}
                </h2>
                <span className="text-[11px] font-headline text-on-surface-variant">
                  Central Ohio
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
                  hideArchived={hideArchived}
                  onHideArchivedToggle={() => setHideArchived((v) => !v)}
                  isAuthenticated={status === "authenticated"}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onDateFromChange={setDateFrom}
                  onDateToChange={setDateTo}
                />
              </div>

              {events.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">search_off</span>
                  <p className="text-[14px] text-on-surface-variant">No events found. Try adjusting your filters.</p>
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
            </section>
          </>
        )}
      </main>

      {/* Selection action bar — shown above the bottom nav when events are selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
          <div className="bg-inverse-surface text-inverse-on-surface rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-2xl">
            <div>
              <p className="text-[15px] font-headline font-bold">
                {selectedIds.size} event{selectedIds.size !== 1 ? "s" : ""} selected
              </p>
              <p className="text-[12px] opacity-70 font-body">Ready to add to calendar</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-full bg-inverse-on-surface text-inverse-surface text-[13px] font-headline font-bold hover:opacity-90 transition-opacity active:scale-95 duration-200"
            >
              Add to Cal
            </button>
          </div>
        </div>
      )}

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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-6 pb-8 pt-4 bg-surface/90 backdrop-blur-2xl z-50 rounded-t-xl shadow-[0_-4px_40px_rgba(0,0,0,0.05)] font-headline text-xs font-medium">
        <Link href="/swipe" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-90 duration-300 px-3 gap-0.5">
          <span className="material-symbols-outlined text-[22px]">explore</span>
          <span>Discover</span>
        </Link>
        <button className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-full px-5 py-2 active:scale-90 duration-300 gap-0.5">
          <span className="material-symbols-outlined text-[22px]">calendar_today</span>
          <span>Browse</span>
        </button>
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
    </div>
  );
}

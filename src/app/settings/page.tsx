"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const REMINDER_OPTIONS = [
  { label: "1 hour before",  value: 60 },
  { label: "3 hours before", value: 180 },
  { label: "1 day before",   value: 1440 },
  { label: "2 days before",  value: 2880 },
  { label: "1 week before",  value: 10080 },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const period = i >= 12 ? "PM" : "AM";
  const hour = i % 12 || 12;
  return { label: `${hour} ${period}`, value: i };
});

const TAG_CATEGORIES: { tag: string; icon: string }[] = [
  { tag: "music",      icon: "music_note" },
  { tag: "sports",     icon: "sports_soccer" },
  { tag: "arts",       icon: "palette" },
  { tag: "food",       icon: "restaurant" },
  { tag: "outdoor",    icon: "forest" },
  { tag: "family",     icon: "family_restroom" },
  { tag: "community",  icon: "groups" },
  { tag: "fitness",    icon: "fitness_center" },
  { tag: "education",  icon: "school" },
  { tag: "nightlife",  icon: "nightlife" },
  { tag: "theater",    icon: "theater_comedy" },
  { tag: "film",       icon: "movie" },
  { tag: "festival",   icon: "celebration" },
  { tag: "holiday",    icon: "event" },
  { tag: "fundraiser", icon: "volunteer_activism" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-14 h-8 rounded-full relative flex items-center px-1 transition-colors duration-200 flex-shrink-0 ${
        checked ? "bg-primary" : "bg-surface-container-highest"
      }`}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Preferences
  const [radius, setRadius] = useState(25);
  const [reminderMinutes, setReminderMinutes] = useState(1440);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertEmailEnabled, setAlertEmailEnabled] = useState(false);

  // Card Discovery
  const [homeZipCode, setHomeZipCode] = useState("");
  const [recencyBias, setRecencyBias] = useState<"all" | "moderate" | "soon">("moderate");
  const [blockWorkHours, setBlockWorkHours] = useState(false);
  const [workStartHour, setWorkStartHour] = useState(9);
  const [workEndHour, setWorkEndHour] = useState(17);
  const [blockLateWeeknights, setBlockLateWeeknights] = useState(false);
  const [weeknightCutoffHour, setWeeknightCutoffHour] = useState(22);
  const [maxWeeksAhead, setMaxWeeksAhead] = useState(4);

  // My Interests
  const [weekendsOnly, setWeekendsOnly] = useState(false);
  const [boostFreeEvents, setBoostFreeEvents] = useState(false);
  const [favoriteKeywords, setFavoriteKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  // Blocked Keywords
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>([]);
  const [blockedInput, setBlockedInput] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [lastCrawl, setLastCrawl] = useState<{
    startedAt: string;
    eventsNew: number;
    success: boolean;
  } | null>(null);

  const keywordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status !== "authenticated") return;

    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (!d) return;
        setRadius(d.defaultRadiusMiles ?? 25);
        setReminderMinutes(d.defaultReminderMinutes ?? 1440);
        setAlertEmail(d.alertEmail ?? "");
        setAlertEmailEnabled(!!(d.alertEmail));
        setHomeZipCode(d.homeZipCode ?? "");
        setRecencyBias(d.recencyBias ?? "moderate");
        setBlockWorkHours(d.blockWorkHours ?? false);
        setWorkStartHour(d.workStartHour ?? 9);
        setWorkEndHour(d.workEndHour ?? 17);
        setBlockLateWeeknights(d.blockLateWeeknights ?? false);
        setWeeknightCutoffHour(d.weeknightCutoffHour ?? 22);
        setMaxWeeksAhead(d.maxWeeksAhead ?? 4);
        setWeekendsOnly(d.weekendsOnly ?? false);
        setBoostFreeEvents(d.boostFreeEvents ?? false);
        setFavoriteKeywords(d.favoriteKeywords ?? []);
        setBlockedKeywords(d.blockedKeywords ?? []);
      });

    fetch("/api/crawl/status")
      .then((r) => r.json())
      .then((d) => { if (d && !d.error) setLastCrawl(d); })
      .catch(() => {});
  }, [status, router]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultRadiusMiles: radius,
        defaultReminderMinutes: reminderMinutes,
        alertEmail: alertEmailEnabled ? alertEmail : "",
        homeZipCode,
        recencyBias,
        blockWorkHours,
        workStartHour,
        workEndHour,
        blockLateWeeknights,
        weeknightCutoffHour,
        maxWeeksAhead,
        weekendsOnly,
        boostFreeEvents,
        favoriteKeywords,
        blockedKeywords,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTriggerCrawl = async () => {
    setTriggering(true);
    await fetch("/api/crawl/trigger", { method: "POST" });
    // Refresh crawl status after a short delay
    setTimeout(() => {
      fetch("/api/crawl/status")
        .then((r) => r.json())
        .then((d) => { if (d && !d.error) setLastCrawl(d); })
        .catch(() => {});
      setTriggering(false);
    }, 2000);
  };

  function addKeyword(kw: string) {
    const trimmed = kw.trim();
    if (!trimmed) return;
    if (!favoriteKeywords.map((k) => k.toLowerCase()).includes(trimmed.toLowerCase())) {
      setFavoriteKeywords((prev) => [...prev, trimmed]);
    }
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    setFavoriteKeywords((prev) => prev.filter((k) => k !== kw));
  }

  function addBlockedKeyword(kw: string) {
    const trimmed = kw.trim();
    if (!trimmed) return;
    if (!blockedKeywords.map((k) => k.toLowerCase()).includes(trimmed.toLowerCase())) {
      setBlockedKeywords((prev) => [...prev, trimmed]);
    }
    setBlockedInput("");
  }

  function removeBlockedKeyword(kw: string) {
    setBlockedKeywords((prev) => prev.filter((k) => k !== kw));
  }

  const saveLabel = saving ? "Saving…" : saved ? "Saved ✓" : "Save preferences";
  const isAdmin = session?.user?.email === "nick.f.weiss@gmail.com";

  const initials = session?.user?.name
    ?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased pb-36">

      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-2xl flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/swipe" className="text-primary active:scale-95 duration-200 transition-transform">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-xl font-headline font-bold text-primary tracking-tight">Settings</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border-2 border-primary/10 flex-shrink-0">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[13px] font-headline font-bold text-primary">{initials}</span>
          )}
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-14">

        {/* Editorial Header */}
        <section className="space-y-2">
          <span className="text-primary font-headline font-bold text-sm uppercase tracking-[0.2em]">
            Profile Configuration
          </span>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight leading-tight">
            Curate Your <br />
            <span className="text-primary">Urban Pulse.</span>
          </h2>
        </section>

        {/* ── Preferences ──────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <h3 className="text-2xl font-headline font-bold">Preferences</h3>
          <div className="bg-surface-container-low rounded-xl p-8 space-y-8">

            {/* Search radius */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-lg font-headline font-semibold">Default search radius</label>
                <span className="text-primary font-headline font-bold text-xl">{radius} miles</span>
              </div>
              <input
                type="range" min={5} max={100} step={5}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Reminder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-1">
                <label className="text-lg font-headline font-semibold">Default reminder</label>
                <p className="text-on-surface-variant text-sm">When should we nudge you?</p>
              </div>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="bg-surface-container-lowest border-none rounded-full px-6 py-4 text-on-surface font-medium focus:ring-2 focus:ring-primary/20 appearance-none shadow-sm"
              >
                {REMINDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Alert email */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-lg font-headline font-semibold">Alert email</label>
                  <p className="text-on-surface-variant text-sm">Notify me on crawl failures</p>
                </div>
                <Toggle checked={alertEmailEnabled} onChange={setAlertEmailEnabled} />
              </div>
              {alertEmailEnabled && (
                <input
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-surface-container-highest border-none rounded-2xl px-6 py-4 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                />
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {saveLabel}
            </button>
          </div>
        </section>

        {/* ── Card Discovery ────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-headline font-bold">Card Discovery</h3>
            <p className="text-on-surface-variant max-w-xl">
              Controls how events are ordered and filtered in the swipe queue.
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-8 space-y-10">

            {/* Recency priority segmented control */}
            <div className="space-y-4">
              <label className="text-sm font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Recency priority
              </label>
              <div className="flex p-1 bg-surface-container rounded-full">
                {(["all", "moderate", "soon"] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRecencyBias(val)}
                    className={`flex-1 py-3 text-sm font-headline font-bold rounded-full transition-all duration-200 ${
                      recencyBias === val
                        ? "bg-surface-container-lowest shadow-sm text-primary"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {val === "all" ? "All dates" : val === "moderate" ? "Prefer sooner" : "Soonest first"}
                  </button>
                ))}
              </div>
            </div>

            {/* Home zip + look-ahead grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Home zip code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={homeZipCode}
                  onChange={(e) => setHomeZipCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="43215"
                  className="w-full bg-surface-container-high border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Look-ahead window
                </label>
                <select
                  value={maxWeeksAhead}
                  onChange={(e) => setMaxWeeksAhead(Number(e.target.value))}
                  className="w-full bg-surface-container-high border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary/20 outline-none text-on-surface appearance-none"
                >
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks</option>
                  <option value={4}>4 weeks</option>
                  <option value={8}>8 weeks</option>
                </select>
              </div>
            </div>

            {/* Time filters */}
            <div className="space-y-6">

              {/* Skip work hours */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined">work_off</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold">Skip work hours</h4>
                    <p className="text-sm text-on-surface-variant">Mon–Fri filtering</p>
                  </div>
                </div>
                {blockWorkHours ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={workStartHour}
                      onChange={(e) => setWorkStartHour(Number(e.target.value))}
                      className="bg-surface-container rounded-full px-3 py-2 text-sm font-headline font-bold text-primary border-none outline-none appearance-none"
                    >
                      {HOUR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <span className="text-on-surface-variant text-sm">—</span>
                    <select
                      value={workEndHour}
                      onChange={(e) => setWorkEndHour(Number(e.target.value))}
                      className="bg-surface-container rounded-full px-3 py-2 text-sm font-headline font-bold text-primary border-none outline-none appearance-none"
                    >
                      {HOUR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button
                      onClick={() => setBlockWorkHours(false)}
                      className="text-on-surface-variant hover:text-error transition-colors ml-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setBlockWorkHours(true)}
                    className="text-sm font-headline font-bold text-primary hover:opacity-70 transition-opacity"
                  >
                    Enable
                  </button>
                )}
              </div>

              {/* Skip late weeknights */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary flex-shrink-0">
                    <span className="material-symbols-outlined">bedtime</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold">Skip late weeknights</h4>
                    <p className="text-sm text-on-surface-variant">Sun–Thu filtering</p>
                  </div>
                </div>
                {blockLateWeeknights ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-on-surface-variant">After</span>
                    <select
                      value={weeknightCutoffHour}
                      onChange={(e) => setWeeknightCutoffHour(Number(e.target.value))}
                      className="bg-surface-container rounded-full px-3 py-2 text-sm font-headline font-bold text-tertiary border-none outline-none appearance-none"
                    >
                      {HOUR_OPTIONS.slice(12).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button
                      onClick={() => setBlockLateWeeknights(false)}
                      className="text-on-surface-variant hover:text-error transition-colors ml-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setBlockLateWeeknights(true)}
                    className="text-sm font-headline font-bold text-primary hover:opacity-70 transition-opacity"
                  >
                    Enable
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-full bg-surface-container-highest text-on-surface font-headline font-bold text-lg active:scale-95 transition-transform disabled:opacity-60"
            >
              {saveLabel}
            </button>
          </div>
        </section>

        {/* ── My Interests ──────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-headline font-bold">My Interests</h3>
            <p className="text-on-surface-variant max-w-xl">
              Events matching these will be surfaced higher. Non-matching events still appear.
            </p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-8 space-y-10">

            {/* Favorite keywords */}
            <div className="space-y-4">
              <label className="text-sm font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Favorite tags
              </label>

              {/* Saved keyword chips */}
              <div className="flex flex-wrap gap-2">
                {favoriteKeywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="px-4 py-2 bg-primary text-white rounded-full text-sm font-headline font-bold flex items-center gap-1.5 hover:bg-error hover:text-on-error transition-colors"
                    title={`Remove ${kw}`}
                  >
                    {kw}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ))}

                {/* Add keyword input trigger */}
                <div className="flex items-center gap-2">
                  <input
                    ref={keywordInputRef}
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addKeyword(keywordInput); }
                    }}
                    placeholder='Add keyword…'
                    className="bg-surface-container border-none rounded-full px-4 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 outline-none w-36"
                  />
                  <button
                    type="button"
                    onClick={() => addKeyword(keywordInput)}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-primary flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick-add categories grid */}
            <div className="space-y-4">
              <label className="text-sm font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Quick-add categories
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {TAG_CATEGORIES.map(({ tag, icon }) => {
                  const isActive = favoriteKeywords.map((k) => k.toLowerCase()).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => isActive ? removeKeyword(tag) : addKeyword(tag)}
                      className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 ${
                        isActive
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-surface-container-lowest text-primary hover:bg-primary/5"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{icon}</span>
                      <span className="text-[10px] font-headline font-bold uppercase tracking-tight">{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-4 border-t border-outline-variant/10">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-lg font-headline font-semibold">Weekends only</label>
                  <p className="text-on-surface-variant text-sm">Only show Fri, Sat, and Sun events</p>
                </div>
                <Toggle checked={weekendsOnly} onChange={setWeekendsOnly} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-lg font-headline font-semibold">Prioritize free events</label>
                  <p className="text-on-surface-variant text-sm">Boost free events in the swipe queue</p>
                </div>
                <Toggle checked={boostFreeEvents} onChange={setBoostFreeEvents} />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold text-lg shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-60"
            >
              {saveLabel}
            </button>
          </div>
        </section>

        {/* ── Blocked Keywords ──────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-headline font-bold">Blocked Keywords</h3>
            <p className="text-on-surface-variant max-w-xl">
              Events matching any of these words in their title, description, or venue will be hidden from your swipe queue and browse list.
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-error/10 rounded-xl p-8 space-y-6">

            {/* Saved blocked keyword chips */}
            <div className="flex flex-wrap gap-2">
              {blockedKeywords.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => removeBlockedKeyword(kw)}
                  className="px-4 py-2 bg-error-container text-on-error-container rounded-full text-sm font-headline font-bold flex items-center gap-1.5 hover:bg-error hover:text-on-error transition-colors"
                  title={`Remove "${kw}"`}
                >
                  {kw}
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              ))}

              {/* Add input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={blockedInput}
                  onChange={(e) => setBlockedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addBlockedKeyword(blockedInput); }
                  }}
                  placeholder="Add keyword to block…"
                  className="bg-surface-container border-none rounded-full px-4 py-2 text-sm text-on-surface focus:ring-2 focus:ring-error/20 outline-none w-48"
                />
                <button
                  type="button"
                  onClick={() => addBlockedKeyword(blockedInput)}
                  className="w-10 h-10 rounded-full border-2 border-dashed border-error flex items-center justify-center text-error hover:bg-error hover:text-on-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">block</span>
                </button>
              </div>
            </div>

            {blockedKeywords.length === 0 && (
              <p className="text-[13px] text-on-surface-variant/60 italic">
                No keywords blocked. Events you add here will never appear in your queue.
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-full bg-surface-container-highest text-on-surface font-headline font-bold text-lg active:scale-95 transition-transform disabled:opacity-60"
            >
              {saveLabel}
            </button>
          </div>
        </section>

        {/* ── Crawler Status — admin only ────────────────────────────────────── */}
        {isAdmin && <section className="space-y-6">
          <h3 className="text-2xl font-headline font-bold">Crawler Status</h3>
          <div className="bg-surface-container-lowest border-2 border-error/10 rounded-xl p-8 relative overflow-hidden">
            {/* Background glow */}
            <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl ${
              lastCrawl?.success ? "bg-[#16a34a]/5" : "bg-error/5"
            }`} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
              <div className="space-y-4">
                {lastCrawl ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${
                        lastCrawl.success ? "bg-[#16a34a]" : "bg-error"
                      }`} />
                      <span className={`font-headline font-bold uppercase tracking-widest text-sm ${
                        lastCrawl.success ? "text-[#16a34a]" : "text-error"
                      }`}>
                        {lastCrawl.success ? "Success" : "Failed"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-on-surface-variant">
                        Last run:{" "}
                        <span className="text-on-surface font-medium">
                          {new Date(lastCrawl.startedAt).toLocaleString()}
                        </span>
                      </p>
                      <p className="text-on-surface-variant">
                        New events found:{" "}
                        <span className="text-on-surface font-medium">{lastCrawl.eventsNew}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-on-surface-variant">No crawl data yet.</p>
                )}
              </div>

              <button
                onClick={handleTriggerCrawl}
                disabled={triggering}
                className="px-8 py-4 rounded-full bg-on-surface text-surface-container-lowest font-headline font-bold flex items-center gap-2 hover:bg-primary transition-colors disabled:opacity-50 active:scale-95 duration-200 flex-shrink-0"
              >
                <span className={`material-symbols-outlined ${triggering ? "animate-spin" : ""}`}>refresh</span>
                {triggering ? "Triggering…" : "Trigger manual crawl"}
              </button>
            </div>
          </div>
        </section>}

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-end px-6 pb-8 pt-4 bg-surface/90 backdrop-blur-2xl shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.08)] rounded-t-xl font-headline">
        <Link href="/swipe" className="flex flex-col items-center justify-center text-on-surface/60 p-2 hover:text-primary transition-colors gap-0.5">
          <span className="material-symbols-outlined">explore</span>
          <span className="text-[11px] font-bold uppercase tracking-widest">Discover</span>
        </Link>
        <Link href="/" className="flex flex-col items-center justify-center text-on-surface/60 p-2 hover:text-primary transition-colors gap-0.5">
          <span className="material-symbols-outlined">calendar_today</span>
          <span className="text-[11px] font-bold uppercase tracking-widest">Browse</span>
        </Link>
        <Link href="/interested" className="flex flex-col items-center justify-center text-on-surface/60 p-2 hover:text-primary transition-colors gap-0.5">
          <span className="material-symbols-outlined">bookmark</span>
          <span className="text-[11px] font-bold uppercase tracking-widest">Saved</span>
        </Link>
        <div className="flex flex-col items-center justify-center bg-primary text-white rounded-full p-3 scale-110 -translate-y-2 shadow-xl shadow-primary/30 gap-0.5">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
          <span className="text-[11px] font-bold uppercase tracking-widest">Settings</span>
        </div>
      </nav>

    </div>
  );
}

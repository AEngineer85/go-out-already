"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";

const REMINDER_OPTIONS = [
  { label: "1 hour before", value: 60 },
  { label: "3 hours before", value: 180 },
  { label: "1 day before", value: 1440 },
  { label: "2 days before", value: 2880 },
  { label: "1 week before", value: 10080 },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const period = i >= 12 ? "PM" : "AM";
  const hour = i % 12 || 12;
  return { label: `${hour} ${period}`, value: i };
});

const EVENT_TAGS = [
  "music", "sports", "arts", "food", "outdoor", "family", "community",
  "fitness", "education", "nightlife", "theater", "film", "festival",
  "holiday", "fundraiser",
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-[#2563EB]" : "bg-[#DDDDDD]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  // ── Existing prefs ────────────────────────────────────────────────────────
  const [radius, setRadius] = useState(25);
  const [reminderMinutes, setReminderMinutes] = useState(1440);
  const [alertEmail, setAlertEmail] = useState("");

  // ── Card Discovery prefs ─────────────────────────────────────────────────
  const [homeZipCode, setHomeZipCode] = useState("");
  const [recencyBias, setRecencyBias] = useState<"all" | "moderate" | "soon">("moderate");
  const [blockWorkHours, setBlockWorkHours] = useState(false);
  const [workStartHour, setWorkStartHour] = useState(9);
  const [workEndHour, setWorkEndHour] = useState(17);
  const [blockLateWeeknights, setBlockLateWeeknights] = useState(false);
  const [weeknightCutoffHour, setWeeknightCutoffHour] = useState(21);
  const [maxWeeksAhead, setMaxWeeksAhead] = useState(8);

  // ── My Interests prefs ────────────────────────────────────────────────────
  const [weekendsOnly, setWeekendsOnly] = useState(false);
  const [boostFreeEvents, setBoostFreeEvents] = useState(false);
  const [favoriteKeywords, setFavoriteKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  // ── UI state ──────────────────────────────────────────────────────────────
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
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/user/preferences")
        .then((r) => r.json())
        .then((d) => {
          if (!d) return;
          setRadius(d.defaultRadiusMiles ?? 25);
          setReminderMinutes(d.defaultReminderMinutes ?? 1440);
          setAlertEmail(d.alertEmail ?? "");
          setHomeZipCode(d.homeZipCode ?? "");
          setRecencyBias(d.recencyBias ?? "moderate");
          setBlockWorkHours(d.blockWorkHours ?? false);
          setWorkStartHour(d.workStartHour ?? 9);
          setWorkEndHour(d.workEndHour ?? 17);
          setBlockLateWeeknights(d.blockLateWeeknights ?? false);
          setWeeknightCutoffHour(d.weeknightCutoffHour ?? 21);
          setMaxWeeksAhead(d.maxWeeksAhead ?? 8);
          setWeekendsOnly(d.weekendsOnly ?? false);
          setBoostFreeEvents(d.boostFreeEvents ?? false);
          setFavoriteKeywords(d.favoriteKeywords ?? []);
        });

      fetch("/api/crawl/status")
        .then((r) => r.json())
        .then(setLastCrawl);
    }
  }, [status, router]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultRadiusMiles: radius,
        defaultReminderMinutes: reminderMinutes,
        alertEmail,
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
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTriggerCrawl = async () => {
    setTriggering(true);
    await fetch("/api/crawl/trigger", { method: "POST" });
    setTriggering(false);
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

  const cardClass =
    "bg-white rounded-[12px] p-5 mb-4";
  const cardStyle = { border: "0.5px solid rgba(0,0,0,0.12)" };
  const labelClass = "text-[13px] font-medium text-[#111111] block mb-1";
  const rowClass = "flex items-center justify-between mb-3";
  const descClass = "text-[11px] text-[#999999] mt-0.5";

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <NavBar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-[18px] font-medium text-[#111111] mb-6">Settings</h1>

        {/* ── Preferences ────────────────────────────────────────────────── */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="text-[14px] font-medium text-[#111111] mb-4">Preferences</h2>

          <div className="mb-4">
            <label className={labelClass}>Default search radius</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="flex-1 accent-[#2563EB]"
              />
              <span className="text-[13px] text-[#555555] w-16 text-right">
                {radius} miles
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Default reminder</label>
            <div className="flex flex-col gap-1.5">
              {REMINDER_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reminder"
                    value={opt.value}
                    checked={reminderMinutes === opt.value}
                    onChange={() => setReminderMinutes(opt.value)}
                    className="accent-[#2563EB]"
                  />
                  <span className="text-[13px] text-[#555555]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className={labelClass}>Alert email (crawl failures)</label>
            <input
              type="email"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border rounded-[8px] px-3 py-2 text-[13px] text-[#111111]"
              style={{ borderColor: "rgba(0,0,0,0.2)" }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-[#2563EB] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#185FA5] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save preferences"}
          </button>
        </div>

        {/* ── Card Discovery ──────────────────────────────────────────────── */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="text-[14px] font-medium text-[#111111] mb-1">Card Discovery</h2>
          <p className={`${descClass} mb-4`}>
            Controls how events are ordered and filtered in the swipe queue.
          </p>

          {/* Recency bias */}
          <div className="mb-4">
            <label className={labelClass}>Recency priority</label>
            <p className={`${descClass} mb-2`}>How much to favor events happening soon.</p>
            <div className="flex rounded-[8px] overflow-hidden border" style={{ borderColor: "rgba(0,0,0,0.15)" }}>
              {(["all", "moderate", "soon"] as const).map((val, i) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRecencyBias(val)}
                  className={`flex-1 py-1.5 text-[12px] font-medium transition-colors ${
                    recencyBias === val
                      ? "bg-[#2563EB] text-white"
                      : "bg-white text-[#555555] hover:bg-[#F5F5F5]"
                  } ${i > 0 ? "border-l" : ""}`}
                  style={i > 0 ? { borderColor: "rgba(0,0,0,0.15)" } : {}}
                >
                  {val === "all" ? "All dates" : val === "moderate" ? "Prefer sooner" : "Soonest first"}
                </button>
              ))}
            </div>
          </div>

          {/* Home zip */}
          <div className="mb-4">
            <label className={labelClass}>Home zip code</label>
            <p className={`${descClass} mb-1.5`}>
              Events are filtered by distance from here instead of Columbus downtown.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={homeZipCode}
              onChange={(e) => setHomeZipCode(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 43085"
              className="w-36 border rounded-[8px] px-3 py-2 text-[13px] text-[#111111]"
              style={{ borderColor: "rgba(0,0,0,0.2)" }}
            />
          </div>

          {/* Max weeks ahead */}
          <div className="mb-4">
            <label className={labelClass}>
              How far ahead to look:{" "}
              <span className="text-[#2563EB]">
                {maxWeeksAhead === 1 ? "1 week" : `${maxWeeksAhead} weeks`}
              </span>
            </label>
            <p className={`${descClass} mb-1.5`}>
              Narrows the queue to events within this window.
            </p>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={maxWeeksAhead}
              onChange={(e) => setMaxWeeksAhead(Number(e.target.value))}
              className="w-full accent-[#2563EB]"
            />
            <div className="flex justify-between text-[10px] text-[#BBBBBB] mt-0.5">
              <span>1 wk</span><span>2</span><span>3</span><span>4</span>
              <span>5</span><span>6</span><span>7</span><span>8 wks</span>
            </div>
          </div>

          {/* Skip work hours */}
          <div className="mb-3">
            <div className={rowClass}>
              <div>
                <p className="text-[13px] font-medium text-[#111111]">Skip work hours</p>
                <p className={descClass}>Hide events that start Mon–Fri during these hours.</p>
              </div>
              <Toggle checked={blockWorkHours} onChange={setBlockWorkHours} />
            </div>
            {blockWorkHours && (
              <div className="flex items-center gap-2 mt-2 ml-1">
                <select
                  value={workStartHour}
                  onChange={(e) => setWorkStartHour(Number(e.target.value))}
                  className="border rounded-[8px] px-2 py-1.5 text-[12px] text-[#111111] bg-white"
                  style={{ borderColor: "rgba(0,0,0,0.2)" }}
                >
                  {HOUR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="text-[12px] text-[#555555]">to</span>
                <select
                  value={workEndHour}
                  onChange={(e) => setWorkEndHour(Number(e.target.value))}
                  className="border rounded-[8px] px-2 py-1.5 text-[12px] text-[#111111] bg-white"
                  style={{ borderColor: "rgba(0,0,0,0.2)" }}
                >
                  {HOUR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Skip late weeknights */}
          <div className="mb-2">
            <div className={rowClass}>
              <div>
                <p className="text-[13px] font-medium text-[#111111]">Skip late weeknights</p>
                <p className={descClass}>Hide events that start after this time on Sun–Thu.</p>
              </div>
              <Toggle checked={blockLateWeeknights} onChange={setBlockLateWeeknights} />
            </div>
            {blockLateWeeknights && (
              <div className="flex items-center gap-2 mt-2 ml-1">
                <span className="text-[12px] text-[#555555]">After</span>
                <select
                  value={weeknightCutoffHour}
                  onChange={(e) => setWeeknightCutoffHour(Number(e.target.value))}
                  className="border rounded-[8px] px-2 py-1.5 text-[12px] text-[#111111] bg-white"
                  style={{ borderColor: "rgba(0,0,0,0.2)" }}
                >
                  {HOUR_OPTIONS.slice(12).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-3 py-2.5 bg-[#2563EB] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#185FA5] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save preferences"}
          </button>
        </div>

        {/* ── My Interests ───────────────────────────────────────────────── */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="text-[14px] font-medium text-[#111111] mb-1">My Interests</h2>
          <p className={`${descClass} mb-4`}>
            Events matching these will be surfaced higher in your swipe queue.
            Non-matching events still appear, just further down.
          </p>

          {/* Favorite keywords input */}
          <div className="mb-4">
            <label className={labelClass}>Favorite venues, teams, bands, or topics</label>
            <div className="flex gap-2 mb-2">
              <input
                ref={keywordInputRef}
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword(keywordInput);
                  }
                }}
                placeholder='e.g. "Columbus Crew" or "Shadowbox"'
                className="flex-1 border rounded-[8px] px-3 py-2 text-[13px] text-[#111111]"
                style={{ borderColor: "rgba(0,0,0,0.2)" }}
              />
              <button
                type="button"
                onClick={() => addKeyword(keywordInput)}
                className="px-3 py-2 bg-[#2563EB] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#185FA5] transition-colors"
              >
                Add
              </button>
            </div>

            {/* Saved keyword chips */}
            {favoriteKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {favoriteKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#EBF1FF] text-[#2563EB]"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="text-[#2563EB] hover:text-[#111111] transition-colors leading-none"
                      aria-label={`Remove ${kw}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick-add tag chips */}
            <p className="text-[11px] text-[#999999] mb-1.5">Quick-add a category:</p>
            <div className="flex flex-wrap gap-1">
              {EVENT_TAGS.filter(
                (t) => !favoriteKeywords.map((k) => k.toLowerCase()).includes(t)
              ).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addKeyword(tag)}
                  className="px-2 py-0.5 rounded-full border text-[11px] text-[#555555] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors capitalize"
                  style={{ borderColor: "rgba(0,0,0,0.2)" }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Quick toggles */}
          <div className="border-t pt-3 mb-2" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
            <div className={rowClass}>
              <div>
                <p className="text-[13px] font-medium text-[#111111]">Weekends only</p>
                <p className={descClass}>Only show Fri, Sat, and Sun events.</p>
              </div>
              <Toggle checked={weekendsOnly} onChange={setWeekendsOnly} />
            </div>
            <div className={rowClass}>
              <div>
                <p className="text-[13px] font-medium text-[#111111]">Prioritize free events</p>
                <p className={descClass}>Boost events listed as free in the swipe queue.</p>
              </div>
              <Toggle checked={boostFreeEvents} onChange={setBoostFreeEvents} />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-1 py-2.5 bg-[#2563EB] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#185FA5] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save preferences"}
          </button>
        </div>

        {/* ── Crawler ─────────────────────────────────────────────────────── */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="text-[14px] font-medium text-[#111111] mb-1">Crawler</h2>
          {lastCrawl && (
            <p className="text-[12px] text-[#555555] mb-3">
              Last crawl:{" "}
              {new Date(lastCrawl.startedAt).toLocaleString()} ·{" "}
              {lastCrawl.eventsNew} new events ·{" "}
              <span className={lastCrawl.success ? "text-[#3B6D11]" : "text-red-600"}>
                {lastCrawl.success ? "Success" : "Failed"}
              </span>
            </p>
          )}
          <button
            onClick={handleTriggerCrawl}
            disabled={triggering}
            className="px-4 py-2 border rounded-[8px] text-[13px] text-[#555555] hover:text-[#111111] hover:border-[#111111] disabled:opacity-50 transition-colors"
            style={{ borderColor: "rgba(0,0,0,0.2)" }}
          >
            {triggering ? "Triggering..." : "Trigger manual crawl"}
          </button>
        </div>
      </main>
    </div>
  );
}

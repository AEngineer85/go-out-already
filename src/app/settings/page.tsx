"use client";

import { useState, useEffect } from "react";
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

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [radius, setRadius] = useState(25);
  const [reminderMinutes, setReminderMinutes] = useState(1440);
  const [alertEmail, setAlertEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [lastCrawl, setLastCrawl] = useState<{
    startedAt: string;
    eventsNew: number;
    success: boolean;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/user/preferences")
        .then((r) => r.json())
        .then((d) => {
          if (d) {
            setRadius(d.defaultRadiusMiles ?? 25);
            setReminderMinutes(d.defaultReminderMinutes ?? 1440);
            setAlertEmail(d.alertEmail ?? "");
          }
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

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <NavBar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-[18px] font-medium text-[#111111] mb-6">Settings</h1>

        <div
          className="bg-white rounded-[12px] p-5 mb-4"
          style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}
        >
          <h2 className="text-[14px] font-medium text-[#111111] mb-4">
            Preferences
          </h2>

          <div className="mb-4">
            <label className="text-[13px] font-medium text-[#111111] block mb-1">
              Default search radius
            </label>
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
            <label className="text-[13px] font-medium text-[#111111] block mb-2">
              Default reminder
            </label>
            <div className="flex flex-col gap-1.5">
              {REMINDER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
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
            <label className="text-[13px] font-medium text-[#111111] block mb-1">
              Alert email (crawl failures)
            </label>
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

        {/* Crawl section */}
        <div
          className="bg-white rounded-[12px] p-5"
          style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}
        >
          <h2 className="text-[14px] font-medium text-[#111111] mb-1">
            Crawler
          </h2>

          {lastCrawl && (
            <p className="text-[12px] text-[#555555] mb-3">
              Last crawl:{" "}
              {new Date(lastCrawl.startedAt).toLocaleString()} ·{" "}
              {lastCrawl.eventsNew} new events ·{" "}
              <span
                className={
                  lastCrawl.success ? "text-[#3B6D11]" : "text-red-600"
                }
              >
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

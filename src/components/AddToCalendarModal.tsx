"use client";

import { useState } from "react";

const REMINDER_OPTIONS = [
  { label: "1 hour before", value: 60 },
  { label: "3 hours before", value: 180 },
  { label: "1 day before", value: 1440 },
  { label: "2 days before", value: 2880 },
  { label: "1 week before", value: 10080 },
  { label: "Custom...", value: -1 },
];

interface AddToCalendarModalProps {
  events: Array<{ id: string; title: string; date: string }>;
  defaultReminderMinutes: number;
  onConfirm: (reminderMinutes: number) => void;
  onClose: () => void;
  loading: boolean;
}

export function AddToCalendarModal({
  events,
  defaultReminderMinutes,
  onConfirm,
  onClose,
  loading,
}: AddToCalendarModalProps) {
  const [selected, setSelected] = useState(defaultReminderMinutes);
  const [customMinutes, setCustomMinutes] = useState("");

  const handleConfirm = () => {
    const minutes = selected === -1 ? parseInt(customMinutes) || 1440 : selected;
    onConfirm(minutes);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[12px] w-full max-w-md shadow-xl">
        <div className="p-5 border-b" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
          <h2 className="text-[15px] font-medium text-[#111111]">
            Add to Google Calendar
          </h2>
          <p className="text-[12px] text-[#555555] mt-1">
            {events.length} event{events.length !== 1 ? "s" : ""} selected
          </p>
        </div>

        <div
          className="p-4 max-h-48 overflow-y-auto border-b"
          style={{ borderColor: "rgba(0,0,0,0.12)" }}
        >
          {events.map((e) => (
            <div key={e.id} className="text-[13px] text-[#111111] py-1">
              {e.title}
            </div>
          ))}
        </div>

        <div className="p-5">
          <label className="text-[13px] font-medium text-[#111111] block mb-2">
            Reminder
          </label>
          <div className="flex flex-col gap-1.5">
            {REMINDER_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reminder"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => setSelected(opt.value)}
                  className="accent-[#2563EB]"
                />
                <span className="text-[13px] text-[#555555]">{opt.label}</span>
              </label>
            ))}
          </div>
          {selected === -1 && (
            <input
              type="number"
              placeholder="Minutes before"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="mt-2 w-full border rounded-[8px] px-3 py-2 text-[13px]"
              style={{ borderColor: "rgba(0,0,0,0.2)" }}
            />
          )}
        </div>

        <div
          className="p-4 border-t flex justify-end gap-3"
          style={{ borderColor: "rgba(0,0,0,0.12)" }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[13px] text-[#555555] hover:text-[#111111]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-white rounded-[8px] bg-[#2563EB] hover:bg-[#185FA5] disabled:opacity-50 transition-colors"
          >
            {loading ? "Adding..." : "Add to Calendar"}
          </button>
        </div>
      </div>
    </div>
  );
}

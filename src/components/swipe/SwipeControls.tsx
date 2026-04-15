"use client";

interface SwipeControlsProps {
  onPass: () => void;
  onInterested: () => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled: boolean;
}

export function SwipeControls({
  onPass,
  onInterested,
  onUndo,
  canUndo,
  disabled,
}: SwipeControlsProps) {
  return (
    <div className="flex items-center justify-center gap-5 mt-5">
      {/* Pass (X) */}
      <button
        onClick={onPass}
        disabled={disabled}
        aria-label="Pass"
        className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center text-[#DC2626] border border-[rgba(0,0,0,0.08)] hover:bg-red-50 active:scale-95 transition-all disabled:opacity-40"
      >
        <svg
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo || disabled}
        aria-label="Undo last swipe"
        className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-[#6B7280] border border-[rgba(0,0,0,0.08)] hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-30"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
          />
        </svg>
      </button>

      {/* Interested (Heart) */}
      <button
        onClick={onInterested}
        disabled={disabled}
        aria-label="Interested"
        className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center text-[#16A34A] border border-[rgba(0,0,0,0.08)] hover:bg-green-50 active:scale-95 transition-all disabled:opacity-40"
      >
        <svg
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
          />
        </svg>
      </button>
    </div>
  );
}

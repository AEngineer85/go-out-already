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
    <div className="flex justify-center items-center gap-8">
      {/* Pass (X) */}
      <button
        onClick={onPass}
        disabled={disabled}
        aria-label="Pass"
        className="w-16 h-16 rounded-full bg-surface-container-lowest swipe-card-shadow flex items-center justify-center text-error hover:bg-error-container hover:text-on-error-container transition-all active:scale-90 duration-300 disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>

      {/* Undo / Info (middle, smaller) */}
      <button
        onClick={onUndo}
        disabled={!canUndo || disabled}
        aria-label="Undo last swipe"
        className="w-12 h-12 rounded-full bg-surface-container-highest shadow-lg flex items-center justify-center text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-90 duration-300 disabled:opacity-30"
      >
        <span className="material-symbols-outlined text-2xl">undo</span>
      </button>

      {/* Interested (Heart) */}
      <button
        onClick={onInterested}
        disabled={disabled}
        aria-label="Save"
        className="w-16 h-16 rounded-full bg-surface-container-lowest swipe-card-shadow flex items-center justify-center text-primary hover:bg-primary-container hover:text-white transition-all active:scale-90 duration-300 disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
      </button>
    </div>
  );
}

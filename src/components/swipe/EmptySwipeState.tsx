"use client";

import Link from "next/link";

interface EmptySwipeStateProps {
  reviewedCount: number;
}

export function EmptySwipeState({ reviewedCount }: EmptySwipeStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-4">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-[#E6F1FB] flex items-center justify-center">
        <svg
          className="w-10 h-10 text-[#2563EB]"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>

      <div>
        <p className="text-[18px] font-semibold text-[#111111]">
          You&apos;re all caught up!
        </p>
        {reviewedCount > 0 && (
          <p className="text-[13px] text-[#555555] mt-1">
            You reviewed {reviewedCount} event{reviewedCount !== 1 ? "s" : ""} this session.
          </p>
        )}
        <p className="text-[13px] text-[#999999] mt-2">
          New events are added regularly — check back soon.
        </p>
      </div>

      <Link
        href="/interested"
        className="mt-2 px-5 py-2.5 rounded-lg bg-[#2563EB] text-white text-[13px] font-medium hover:bg-[#185FA5] transition-colors"
      >
        View saved events →
      </Link>
    </div>
  );
}

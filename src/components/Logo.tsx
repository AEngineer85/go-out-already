export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Go Out Already logo"
    >
      <rect width="28" height="28" rx="6" fill="#2563EB" />
      <circle cx="14" cy="10" r="3.5" fill="white" />
      <path
        d="M14 15c-4 0-6 2-6 3.5h12c0-1.5-2-3.5-6-3.5z"
        fill="white"
      />
    </svg>
  );
}

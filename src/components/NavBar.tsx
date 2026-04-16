"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export function NavBar() {
  const { data: session } = useSession();
  const [interestedCount, setInterestedCount] = useState(0);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  useEffect(() => {
    if (!session) return;
    fetch("/api/swipe/stats")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.interestedCount === "number") {
          setInterestedCount(d.interestedCount);
        }
      })
      .catch(() => {});
  }, [session]);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-6 py-4 font-body">
      <Link href="/" className="flex items-center gap-2.5">
        <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">
          go out already
        </h1>
      </Link>

      <nav className="flex items-center gap-2">
        {session ? (
          <>
            <Link
              href="/swipe"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-headline font-bold text-on-surface-variant hover:bg-surface-container transition-colors active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-[18px]">explore</span>
              Swipe
            </Link>
            <Link
              href="/interested"
              className="relative flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-headline font-bold text-on-surface-variant hover:bg-surface-container transition-colors active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-[18px]">bookmark</span>
              Saved
              {interestedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-on-primary bg-primary px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                  {interestedCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => signOut()}
              className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-primary/10 flex-shrink-0 ml-1"
              title="Sign out"
            >
              {session.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] font-headline font-bold text-primary">{initials}</span>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="px-5 py-2 rounded-full bg-primary text-on-primary text-[13px] font-headline font-bold hover:opacity-90 transition-opacity active:scale-95 duration-200"
          >
            Sign in
          </button>
        )}
      </nav>
    </header>
  );
}

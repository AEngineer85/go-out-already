"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Logo } from "@/components/Logo";

export function NavBar() {
  const { data: session } = useSession();

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <nav
      className="w-full bg-white border-b flex items-center justify-between px-4 sticky top-0 z-50"
      style={{ height: 52, borderColor: "rgba(0,0,0,0.12)", borderBottomWidth: "0.5px" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <Logo size={28} />
        <span className="text-[15px] font-medium">
          <span className="text-[#111111]">go out </span>
          <span className="text-[#2563EB]">already</span>
        </span>
      </Link>

      <div className="flex items-center gap-3">
        {session ? (
          <>
            <Link
              href="/settings"
              className="text-[13px] text-[#555555] hover:text-[#111111]"
            >
              Settings
            </Link>
            <button
              onClick={() => signOut()}
              className="w-8 h-8 rounded-lg bg-[#E6F1FB] flex items-center justify-center text-[#2563EB] text-[12px] font-medium"
              title="Sign out"
            >
              {initials}
            </button>
          </>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="text-[13px] text-[#2563EB] font-medium hover:text-[#185FA5]"
          >
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
}

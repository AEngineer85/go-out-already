"use client";

import { signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center px-4">
      <div
        className="bg-white rounded-[16px] p-8 w-full max-w-sm text-center shadow-sm"
        style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}
      >
        <div className="flex justify-center mb-4">
          <Logo size={48} />
        </div>
        <h1 className="text-[20px] font-medium text-[#111111] mb-1">
          go out <span className="text-[#2563EB]">already</span>
        </h1>
        <p className="text-[14px] text-[#555555] mb-8">
          Central Ohio events, all in one place.
        </p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full py-3 bg-[#2563EB] text-white rounded-[12px] text-[14px] font-medium hover:bg-[#185FA5] transition-colors flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="white"
              fillOpacity="0.9"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
              fill="white"
              fillOpacity="0.9"
            />
            <path
              d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
              fill="white"
              fillOpacity="0.9"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              fill="white"
              fillOpacity="0.9"
            />
          </svg>
          Sign in with Google
        </button>
        <p className="text-[11px] text-[#999999] mt-4">
          We request access to your Google Calendar to add events on your behalf.
        </p>
      </div>
    </div>
  );
}

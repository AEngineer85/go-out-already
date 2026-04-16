"use client";

import { motion, MotionValue } from "framer-motion";

interface SwipeLabelProps {
  type: "interested" | "pass";
  opacity: MotionValue<number>;
}

export function SwipeLabel({ type, opacity }: SwipeLabelProps) {
  const isInterested = type === "interested";

  return (
    <motion.div
      style={{ opacity }}
      className={`absolute top-5 px-4 py-1.5 rounded-full border-2 font-headline font-bold text-[12px] tracking-widest z-10 ${
        isInterested
          ? "left-5 border-[#16A34A] text-[#16A34A] bg-white/90"
          : "right-5 border-error text-error bg-white/90"
      }`}
    >
      {isInterested ? "SAVE" : "PASS"}
    </motion.div>
  );
}

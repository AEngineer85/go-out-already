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
      className={`absolute top-4 px-3 py-1 rounded-full border-2 font-bold text-[13px] tracking-wider z-10 ${
        isInterested
          ? "left-4 border-[#16A34A] text-[#16A34A] bg-white/90"
          : "right-4 border-[#DC2626] text-[#DC2626] bg-white/90"
      }`}
    >
      {isInterested ? "INTERESTED" : "PASS"}
    </motion.div>
  );
}

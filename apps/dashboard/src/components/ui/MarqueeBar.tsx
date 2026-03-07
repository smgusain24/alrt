"use client";

import Marquee from "react-fast-marquee";
import { ReactNode } from "react";

interface MarqueeBarProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export default function MarqueeBar({
  children,
  speed = 50,
  className = "",
}: MarqueeBarProps) {
  return (
    <div
      className={`bg-[#111113] py-2 border-y border-[rgba(255,255,255,0.06)] ${className}`}
      aria-hidden="true"
    >
      <Marquee speed={speed} gradient={false} pauseOnHover>
        <span className="text-sm tracking-wide px-8 text-[#71717a]">
          {children}
        </span>
      </Marquee>
    </div>
  );
}

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
      className={`bg-navy py-1.5 border-y-2 border-muted ${className}`}
      aria-live="polite"
    >
      <Marquee speed={speed} gradient={false} pauseOnHover>
        <span className="font-heading text-sm tracking-wide px-8">
          {children}
        </span>
      </Marquee>
    </div>
  );
}

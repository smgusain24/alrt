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
      className={className || undefined}
      style={{
        background: "var(--color-surface)",
        padding: "0.5rem 0",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
      }}
      aria-hidden="true"
    >
      <Marquee speed={speed} gradient={false} pauseOnHover>
        <span
          style={{
            fontSize: "0.875rem",
            letterSpacing: "0.025em",
            padding: "0 2rem",
            color: "var(--color-text-muted)",
          }}
        >
          {children}
        </span>
      </Marquee>
    </div>
  );
}

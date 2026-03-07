"use client";

import { useState, useRef, ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const positionClasses: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export default function Tooltip({
  content,
  children,
  position = "top",
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 200);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 whitespace-nowrap
            bg-[#18181b] text-[#fafafa] text-xs rounded px-2 py-1
            pointer-events-none
            ${positionClasses[position]}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, ReactNode, CSSProperties } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const positionStyles: Record<string, CSSProperties> = {
  top: {
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    marginBottom: "0.5rem",
  },
  bottom: {
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    marginTop: "0.5rem",
  },
  left: {
    right: "100%",
    top: "50%",
    transform: "translateY(-50%)",
    marginRight: "0.5rem",
  },
  right: {
    left: "100%",
    top: "50%",
    transform: "translateY(-50%)",
    marginLeft: "0.5rem",
  },
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
      className={className || undefined}
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 50,
            whiteSpace: "nowrap",
            background: "var(--color-elevated)",
            color: "var(--color-text-primary)",
            fontSize: "0.75rem",
            borderRadius: "4px",
            padding: "0.25rem 0.5rem",
            pointerEvents: "none",
            ...positionStyles[position],
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

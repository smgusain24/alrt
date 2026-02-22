"use client";

import { ReactNode, useEffect } from "react";
import WindowCard from "./WindowCard";

interface RetroModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export default function RetroModal({
  title,
  open,
  onClose,
  children,
  className = "",
}: RetroModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md mx-4 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <WindowCard title={title}>{children}</WindowCard>
      </div>
    </div>
  );
}

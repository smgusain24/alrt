"use client";

import { ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export default function Modal({
  title,
  open,
  onClose,
  children,
  className = "",
}: ModalProps) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full max-w-md mx-4 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-md shadow-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#fafafa] px-6 pt-6">
          {title}
        </h2>
        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

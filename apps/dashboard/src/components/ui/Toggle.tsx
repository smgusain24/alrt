"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  className = "",
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex items-center
        h-5 w-9 shrink-0 rounded-full
        transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3b82f6]
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer
        ${checked ? "bg-[#3b82f6]" : "bg-[#18181b]"}
        ${className}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block
          h-3.5 w-3.5 rounded-full bg-white
          shadow-sm
          transition-transform duration-200 ease-in-out
          ${checked ? "translate-x-[18px]" : "translate-x-[3px]"}
        `}
      />
    </button>
  );
}

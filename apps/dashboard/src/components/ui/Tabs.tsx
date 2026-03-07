"use client";

interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({
  tabs,
  active,
  onChange,
  className = "",
}: TabsProps) {
  return (
    <div className={`border-b border-[rgba(255,255,255,0.06)] ${className}`}>
      <nav className="flex gap-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`
                relative pb-2.5 text-sm font-medium
                transition-colors duration-150
                cursor-pointer
                focus-visible:outline-none
                ${
                  isActive
                    ? "text-[#fafafa]"
                    : "text-[#71717a] hover:text-[#a1a1aa]"
                }
              `}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#3b82f6]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

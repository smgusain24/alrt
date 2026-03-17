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
    <div
      role="tablist"
      aria-label="Tabs"
      className={className || undefined}
      style={{
        display: "flex",
        gap: "1.5rem",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              position: "relative",
              paddingBottom: "0.625rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isActive
                ? "var(--color-text-primary)"
                : "var(--color-text-muted)",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            {tab.label}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: "-1px",
                  height: "2px",
                  background: "var(--color-accent)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

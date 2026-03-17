"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface DocsSidebarProps {
  sections: Section[];
}

export default function DocsSidebar({ sections }: DocsSidebarProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    const allIds = sections.flatMap((s) => [
      s.id,
      ...(s.children?.map((c) => c.id) || []),
    ]);

    for (const id of allIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav style={{ height: "100%", paddingTop: "32px", paddingRight: "24px" }}>
      <div style={{ paddingLeft: "24px", paddingBottom: "16px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-text-muted)",
          }}
        >
          API Reference
        </span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {sections.map((section) => {
          const isActive =
            activeId === section.id ||
            section.children?.some((c) => c.id === activeId);

          return (
            <li key={section.id}>
              <button
                onClick={() => handleClick(section.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 24px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "color 150ms",
                  borderLeft: `2px solid ${isActive ? "var(--color-accent)" : "transparent"}`,
                  color: isActive
                    ? "var(--color-text-primary)"
                    : "var(--color-text-muted)",
                  background: "none",
                  border: "none",
                  borderLeftWidth: "2px",
                  borderLeftStyle: "solid",
                  borderLeftColor: isActive ? "var(--color-accent)" : "transparent",
                }}
              >
                {section.label}
              </button>
              {section.children && isActive && (
                <ul style={{ listStyle: "none", padding: 0, margin: "2px 0 4px 0" }}>
                  {section.children.map((child) => (
                    <li key={child.id}>
                      <button
                        onClick={() => handleClick(child.id)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "4px 24px 4px 40px",
                          fontSize: "12px",
                          fontFamily: "var(--font-mono)",
                          cursor: "pointer",
                          transition: "color 150ms",
                          color:
                            activeId === child.id
                              ? "var(--color-accent)"
                              : "var(--color-text-muted)",
                          background: "none",
                          border: "none",
                        }}
                      >
                        {child.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

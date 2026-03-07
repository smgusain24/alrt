"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface DocsSidebarProps {
  sections: Section[];
  className?: string;
}

export default function DocsSidebar({ sections, className = "" }: DocsSidebarProps) {
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
    <nav className={`h-full pt-8 pr-6 ${className}`}>
      <div className="pl-6 pb-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          API Reference
        </span>
      </div>
      <ul className="space-y-0.5">
        {sections.map((section) => {
          const isActive = activeId === section.id ||
            section.children?.some((c) => c.id === activeId);

          return (
            <li key={section.id}>
              <button
                onClick={() => handleClick(section.id)}
                className={`
                  group w-full text-left px-6 py-1.5 text-[13px] font-medium
                  cursor-pointer transition-colors duration-150
                  border-l-2
                  ${
                    isActive
                      ? "border-accent text-text-primary"
                      : "border-transparent text-text-muted hover:text-text-secondary"
                  }
                `}
              >
                {section.label}
              </button>
              {section.children && isActive && (
                <ul className="mt-0.5 mb-1">
                  {section.children.map((child) => (
                    <li key={child.id}>
                      <button
                        onClick={() => handleClick(child.id)}
                        className={`
                          w-full text-left pl-10 pr-6 py-1 text-xs font-mono
                          cursor-pointer transition-colors duration-150
                          ${
                            activeId === child.id
                              ? "text-accent"
                              : "text-text-muted hover:text-text-secondary"
                          }
                        `}
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

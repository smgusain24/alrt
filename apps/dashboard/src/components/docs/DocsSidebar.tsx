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
    <nav className={`bevel-outset bg-[#c0c0c0] p-2 ${className}`}>
      <div className="space-y-0.5">
        {sections.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => handleClick(section.id)}
              className={`
                w-full text-left px-3 py-1.5 text-xs font-bold uppercase tracking-wide
                transition-none cursor-pointer focus-retro
                ${
                  activeId === section.id
                    ? "bevel-inset bg-white text-accent"
                    : "bevel-outset bg-[#c0c0c0] text-foreground hover:bg-[#d0d0d0]"
                }
              `}
            >
              {section.label}
            </button>
            {section.children && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                {section.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleClick(child.id)}
                    className={`
                      w-full text-left px-2 py-1 text-[10px] font-mono
                      transition-none cursor-pointer focus-retro
                      ${
                        activeId === child.id
                          ? "text-accent font-bold"
                          : "text-muted hover:text-foreground"
                      }
                    `}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

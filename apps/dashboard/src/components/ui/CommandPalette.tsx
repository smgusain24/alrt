"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Workflow,
  Users,
  BarChart,
  Activity,
  Settings,
  Plus,
  ArrowRight,
  Command,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  section: string;
  icon: typeof Search;
  action: () => void;
  keywords?: string;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  // Simple character-by-character fuzzy match
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      close();
      router.push(path);
    },
    [close, router]
  );

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      { id: "nav-workflows", label: "Go to Workflows", section: "Navigation", icon: Workflow, action: () => navigate("/workflows"), keywords: "workflows list" },
      { id: "nav-subscribers", label: "Go to Subscribers", section: "Navigation", icon: Users, action: () => navigate("/subscribers"), keywords: "subscribers users" },
      { id: "nav-analytics", label: "Go to Analytics", section: "Navigation", icon: BarChart, action: () => navigate("/analytics"), keywords: "analytics metrics stats" },
      { id: "nav-activity", label: "Go to Activity", section: "Navigation", icon: Activity, action: () => navigate("/activity"), keywords: "activity notifications logs" },
      { id: "nav-settings", label: "Go to Settings", section: "Navigation", icon: Settings, action: () => navigate("/settings"), keywords: "settings api keys" },
      { id: "nav-providers", label: "Go to Providers", section: "Navigation", icon: Settings, action: () => navigate("/settings/providers"), keywords: "providers email slack" },
      // Actions
      { id: "act-new-workflow", label: "Create New Workflow", section: "Actions", icon: Plus, action: () => navigate("/workflows"), keywords: "new workflow create add" },
    ],
    [navigate]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return commands.filter(
      (cmd) =>
        fuzzyMatch(query, cmd.label) ||
        (cmd.keywords && fuzzyMatch(query, cmd.keywords))
    );
  }, [query, commands]);

  // Group by section
  const sections = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const list = map.get(item.section) || [];
      list.push(item);
      map.set(item.section, list);
    }
    return map;
  }, [filtered]);

  // Flatten for index tracking
  const flatItems = useMemo(() => filtered, [filtered]);

  // Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatItems[activeIndex]) flatItems[activeIndex].action();
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, activeIndex, flatItems, close]);

  // Reset active index on query change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <Search className="w-4 h-4 text-[#71717a] shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-sm text-[#fafafa] placeholder:text-[#71717a] focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-[#71717a] bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto p-1.5">
          {flatItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[#71717a]">
              No results found
            </div>
          ) : (
            Array.from(sections.entries()).map(([section, items]) => (
              <div key={section}>
                <div className="px-3 py-1.5 text-[10px] font-medium text-[#71717a] uppercase tracking-wider">
                  {section}
                </div>
                {items.map((item) => {
                  runningIndex++;
                  const isActive = runningIndex === activeIndex;
                  const idx = runningIndex;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      onClick={() => item.action()}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left
                        transition-colors duration-75
                        ${isActive ? "bg-[#18181b] text-[#fafafa]" : "text-[#a1a1aa] hover:bg-[#18181b]"}
                      `}
                    >
                      <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <ArrowRight className="w-3 h-3 text-[#71717a]" strokeWidth={2} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-4 text-[10px] text-[#71717a]">
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded px-1 py-0.5">&uarr;&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded px-1 py-0.5">&crarr;</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded px-1 py-0.5">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

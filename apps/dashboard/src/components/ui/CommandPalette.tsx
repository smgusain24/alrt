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
  const dialogRef = useRef<HTMLDialogElement>(null);
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
      { id: "nav-workflows", label: "Go to Workflows", section: "Navigation", icon: Workflow, action: () => navigate("/workflows"), keywords: "workflows list" },
      { id: "nav-subscribers", label: "Go to Subscribers", section: "Navigation", icon: Users, action: () => navigate("/subscribers"), keywords: "subscribers users" },
      { id: "nav-analytics", label: "Go to Analytics", section: "Navigation", icon: BarChart, action: () => navigate("/analytics"), keywords: "analytics metrics stats" },
      { id: "nav-activity", label: "Go to Activity", section: "Navigation", icon: Activity, action: () => navigate("/activity"), keywords: "activity notifications logs" },
      { id: "nav-settings", label: "Go to Settings", section: "Navigation", icon: Settings, action: () => navigate("/settings"), keywords: "settings api keys" },
      { id: "nav-providers", label: "Go to Providers", section: "Navigation", icon: Settings, action: () => navigate("/settings/providers"), keywords: "providers email slack" },
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

  const sections = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const list = map.get(item.section) || [];
      list.push(item);
      map.set(item.section, list);
    }
    return map;
  }, [filtered]);

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

  // Show/hide dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      dialog.close();
    }
  }, [open]);

  // Handle native close event
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      setOpen(false);
      setQuery("");
      setActiveIndex(0);
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

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

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let runningIndex = -1;

  const kbdStyle: React.CSSProperties = {
    fontSize: "10px",
    fontFamily: "monospace",
    color: "var(--color-text-muted)",
    background: "var(--color-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "3px",
    padding: "2px 6px",
  };

  return (
    <dialog
      ref={dialogRef}
      style={{
        position: "fixed",
        top: "20vh",
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "32rem",
        padding: 0,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        boxShadow: "0 0 60px rgba(0, 0, 0, 0.6)",
        overflow: "hidden",
        color: "var(--color-text-primary)",
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
    >
      {/* Search input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <Search style={{ width: 16, height: 16, color: "var(--color-text-muted)", flexShrink: 0 }} strokeWidth={2} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search commands..."
          style={{
            flex: 1,
            background: "transparent",
            fontSize: "0.875rem",
            color: "var(--color-text-primary)",
            border: "none",
            outline: "none",
          }}
        />
        <kbd style={kbdStyle}>esc</kbd>
      </div>

      {/* Results */}
      <div
        ref={listRef}
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          padding: "0.375rem",
        }}
      >
        {flatItems.length === 0 ? (
          <div
            style={{
              padding: "1.5rem 0.75rem",
              textAlign: "center",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            No results found
          </div>
        ) : (
          Array.from(sections.entries()).map(([section, items]) => (
            <div key={section}>
              <div
                style={{
                  padding: "0.375rem 0.75rem",
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
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
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      textAlign: "left",
                      background: isActive ? "var(--color-elevated)" : "transparent",
                      color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.075s, color 0.075s",
                    }}
                  >
                    <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} strokeWidth={1.5} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {isActive && (
                      <ArrowRight style={{ width: 12, height: 12, color: "var(--color-text-muted)" }} strokeWidth={2} />
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: "0.5rem 1rem",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          fontSize: "10px",
          color: "var(--color-text-muted)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <kbd style={kbdStyle}>&uarr;&darr;</kbd>
          navigate
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <kbd style={kbdStyle}>&crarr;</kbd>
          select
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <kbd style={kbdStyle}>esc</kbd>
          close
        </span>
      </div>
    </dialog>
  );
}

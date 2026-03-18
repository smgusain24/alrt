"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ArrowRight } from "lucide-react";

interface SearchItem {
  id: string;
  label: string;
  category: string;
  signature?: string;
}

interface SearchDialogProps {
  items: SearchItem[];
}

export default function SearchDialog({ items }: SearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);

  const filtered = query
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.signature?.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const navigate = useCallback(
    (id: string) => {
      setOpen(false);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    []
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && filtered[selected]) {
      navigate(filtered[selected].id);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "7px 14px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "6px",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          fontSize: "13px",
          minWidth: "200px",
          transition: "border-color 150ms",
        }}
      >
        <Search style={{ width: 14, height: 14 }} />
        <span style={{ flex: 1, textAlign: "left" }}>Search SDK methods...</span>
        <kbd
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            padding: "1px 6px",
            background: "var(--color-elevated)",
            borderRadius: "3px",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          {"\u2318"}K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 100,
        }}
      />
      {/* Dialog */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "560px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          zIndex: 101,
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <Search
            style={{ width: 16, height: 16, color: "var(--color-text-muted)", flexShrink: 0 }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search SDK methods, resources..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--color-text-primary)",
              fontSize: "15px",
              fontFamily: "var(--font-sans)",
            }}
          />
          <kbd
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              padding: "2px 6px",
              background: "var(--color-elevated)",
              borderRadius: "3px",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            esc
          </kbd>
        </div>
        {/* Results */}
        <div
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            padding: "8px",
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "13px",
              }}
            >
              No results found
            </div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              onMouseEnter={() => setSelected(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 12px",
                background:
                  i === selected ? "var(--color-elevated)" : "transparent",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 100ms",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-accent)",
                  minWidth: "80px",
                }}
              >
                {item.category}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  color: "var(--color-text-primary)",
                  flex: 1,
                }}
              >
                {item.signature || item.label}
              </span>
              {i === selected && (
                <ArrowRight
                  style={{
                    width: 14,
                    height: 14,
                    color: "var(--color-text-muted)",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export type { SearchItem };

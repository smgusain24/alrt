import { useEffect } from "react";

interface ShortcutHandlers {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onEscape: () => void;
}

export default function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+S — Save
      if (isMod && e.key === "s") {
        e.preventDefault();
        handlers.onSave();
        return;
      }

      // Cmd+Shift+Z — Redo
      if (isMod && e.shiftKey && e.key === "z") {
        e.preventDefault();
        handlers.onRedo();
        return;
      }

      // Cmd+Z — Undo
      if (isMod && e.key === "z") {
        e.preventDefault();
        handlers.onUndo();
        return;
      }

      // Delete / Backspace — Delete selected node
      if (e.key === "Delete" || e.key === "Backspace") {
        // Only fire if not focused on an input/textarea
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        handlers.onDelete();
        return;
      }

      // Escape — Close panel / deselect
      if (e.key === "Escape") {
        handlers.onEscape();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}

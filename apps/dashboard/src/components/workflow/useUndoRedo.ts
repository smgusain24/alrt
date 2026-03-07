import { useCallback, useRef } from "react";
import { Node, Edge } from "reactflow";

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

export default function useUndoRedo() {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    // Debounce rapid changes (e.g. node dragging)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const snapshot: Snapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };
      past.current = [...past.current.slice(-(MAX_HISTORY - 1)), snapshot];
      future.current = [];
    }, 200);
  }, []);

  const undo = useCallback(
    (
      currentNodes: Node[],
      currentEdges: Edge[],
      setNodes: (nodes: Node[]) => void,
      setEdges: (edges: Edge[]) => void
    ) => {
      if (past.current.length === 0) return;
      const prev = past.current[past.current.length - 1];
      past.current = past.current.slice(0, -1);
      future.current = [
        ...future.current,
        {
          nodes: JSON.parse(JSON.stringify(currentNodes)),
          edges: JSON.parse(JSON.stringify(currentEdges)),
        },
      ];
      setNodes(prev.nodes);
      setEdges(prev.edges);
    },
    []
  );

  const redo = useCallback(
    (
      setNodes: (nodes: Node[]) => void,
      setEdges: (edges: Edge[]) => void,
      currentNodes: Node[],
      currentEdges: Edge[]
    ) => {
      if (future.current.length === 0) return;
      const next = future.current[future.current.length - 1];
      future.current = future.current.slice(0, -1);
      past.current = [
        ...past.current,
        {
          nodes: JSON.parse(JSON.stringify(currentNodes)),
          edges: JSON.parse(JSON.stringify(currentEdges)),
        },
      ];
      setNodes(next.nodes);
      setEdges(next.edges);
    },
    []
  );

  const canUndo = useCallback(() => past.current.length > 0, []);
  const canRedo = useCallback(() => future.current.length > 0, []);

  return { takeSnapshot, undo, redo, canUndo, canRedo };
}
